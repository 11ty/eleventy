import fs from "node:fs";
import path from "node:path";
import { TemplatePath } from "@11ty/eleventy-utils";
import isGlob from "is-glob";

/* Directories internally should always use *nix forward slashes */
class ProjectDirectories {
	#raw = {};

	#defaults = {
		input: "./",
		data: "./_data/", // Relative to input directory
		includes: "./_includes/", // Relative to input directory
		layouts: "./_layouts/", // Relative to input directory
		output: "./_site/",
	};

	#dirs = {};
	#configDefined = {};

	inputFile = undefined;
	inputGlob = undefined;

	// Add leading dot slash
	// Use forward slashes
	static normalizePath(fileOrDir) {
		return TemplatePath.standardizeFilePath(fileOrDir);
	}

	// Must be a directory
	// Always include a trailing slash
	static normalizeDirectory(dir) {
		return this.addTrailingSlash(this.normalizePath(dir));
	}

	normalizeDirectoryPathRelativeToInputDirectory(filePath) {
		return ProjectDirectories.normalizeDirectory(path.join(this.input, filePath));
	}

	static addTrailingSlash(path) {
		if (path.slice(-1) === "/") {
			return path;
		}
		return path + "/";
	}

	isDefinedViaConfig(key) {
		return !!this.#configDefined[key];
	}

	setViaConfigObject(configDirs = {}) {
		for (let key in configDirs) {
			this.#configDefined[key] = true;
		}

		// input must come last
		let inputChanged = false;
		if (
			configDirs.input &&
			ProjectDirectories.normalizeDirectory(configDirs.input) !== this.input
		) {
			this.#setInputRaw(configDirs.input);
			inputChanged = true;
		}

		// If falsy or an empty string, the current directory is used.
		if (configDirs.output !== undefined) {
			if (ProjectDirectories.normalizeDirectory(configDirs.output) !== this.output) {
				this.setOutput(configDirs.output);
			}
		}

		// Input relative directory, if falsy or an empty string, inputDir is used!
		if (configDirs.data !== undefined) {
			if (
				this.normalizeDirectoryPathRelativeToInputDirectory(configDirs.data || "") !== this.data
			) {
				this.setData(configDirs.data);
			}
		}

		// Input relative directory, if falsy or an empty string, inputDir is used!
		if (configDirs.includes !== undefined) {
			if (
				this.normalizeDirectoryPathRelativeToInputDirectory(configDirs.includes || "") !==
				this.includes
			) {
				this.setIncludes(configDirs.includes);
			}
		}

		// Input relative directory, if falsy or an empty string, inputDir is used!
		if (configDirs.layouts !== undefined) {
			if (
				this.normalizeDirectoryPathRelativeToInputDirectory(configDirs.layouts || "") !==
				this.layouts
			) {
				this.setLayouts(configDirs.layouts);
			}
		}

		if (inputChanged) {
			this.updateInputDependencies();
		}
	}

	updateInputDependencies() {
		// raw first, fall back to Eleventy defaults if not yet set
		this.setData(this.#raw.data ?? this.#defaults.data);
		this.setIncludes(this.#raw.includes ?? this.#defaults.includes);

		// Should not include this if not explicitly opted-in
		if (this.#raw.layouts !== undefined) {
			this.setLayouts(this.#raw.layouts ?? this.#defaults.layouts);
		}
	}

	/* Relative to project root, must exist */
	#setInputRaw(dirOrFile, inputDir = undefined) {
		this.#raw.input = dirOrFile;

		if (!dirOrFile) {
			// input must exist if inputDir is not set.
			return;
		}

		// Input has to exist (assumed glob if it does not exist)
		let inputExists = fs.existsSync(dirOrFile);
		let inputExistsAndIsDirectory = inputExists && fs.statSync(dirOrFile).isDirectory();

		if (inputExistsAndIsDirectory) {
			// is not a file or glob
			this.#dirs.input = ProjectDirectories.normalizeDirectory(dirOrFile);
		} else {
			if (inputExists) {
				this.inputFile = ProjectDirectories.normalizePath(dirOrFile);
			} else {
				if (!isGlob(dirOrFile)) {
					throw new Error(
						`The "${dirOrFile}" \`input\` parameter (directory or file path) must exist on the file system (unless detected as a glob by the \`is-glob\` package)`,
					);
				}

				this.inputGlob = dirOrFile;
			}

			// Explicit Eleventy option for inputDir
			if (inputDir) {
				// Changed in 3.0: must exist
				if (!fs.existsSync(inputDir)) {
					throw new Error("Directory must exist (via inputDir option to Eleventy constructor).");
				}

				this.#dirs.input = ProjectDirectories.normalizeDirectory(inputDir);
			} else {
				// the input directory is implied to be the parent directory of the
				// file, unless inputDir is explicitly specified (via Eleventy constructor `options`)
				this.#dirs.input = ProjectDirectories.normalizeDirectory(
					TemplatePath.getDirFromFilePath(dirOrFile), // works with globs
				);
			}
		}
	}

	setInput(dirOrFile, inputDir = undefined) {
		this.#setInputRaw(dirOrFile, inputDir); // does not update
		this.updateInputDependencies();
	}

	/* Relative to input dir */
	setIncludes(dir) {
		if (dir !== undefined) {
			// falsy or an empty string is valid (falls back to input dir)
			this.#raw.includes = dir;
			this.#dirs.includes = ProjectDirectories.normalizeDirectory(
				TemplatePath.join(this.input, dir || ""),
			);
		}
	}

	/* Relative to input dir */
	/* Optional */
	setLayouts(dir) {
		if (dir !== undefined) {
			// falsy or an empty string is valid (falls back to input dir)
			this.#raw.layouts = dir;
			this.#dirs.layouts = ProjectDirectories.normalizeDirectory(
				TemplatePath.join(this.input, dir || ""),
			);
		}
	}

	/* Relative to input dir */
	setData(dir) {
		if (dir !== undefined) {
			// falsy or an empty string is valid (falls back to input dir)
			// TODO must exist if specified
			this.#raw.data = dir;
			this.#dirs.data = ProjectDirectories.normalizeDirectory(
				TemplatePath.join(this.input, dir || ""),
			);
		}
	}

	/* Relative to project root */
	setOutput(dir) {
		if (dir !== undefined) {
			this.#raw.output = dir;
			this.#dirs.output = ProjectDirectories.normalizeDirectory(dir || "");
		}
	}

	get input() {
		return this.#dirs.input || this.#defaults.input;
	}

	get data() {
		return this.#dirs.data || this.#defaults.data;
	}

	get includes() {
		return this.#dirs.includes || this.#defaults.includes;
	}

	get layouts() {
		// explicit opt-in, no fallback.
		return this.#dirs.layouts;
	}

	get output() {
		return this.#dirs.output || this.#defaults.output;
	}

	// for a hypothetical template file
	getInputPath(filePath) {
		// TODO change ~/ to project root dir
		return TemplatePath.addLeadingDotSlash(
			TemplatePath.join(this.input, TemplatePath.standardizeFilePath(filePath)),
		);
	}

	// Inverse of getInputPath
	getInputPathRelativeToInputDirectory(filePath) {
		let inputDir = TemplatePath.addLeadingDotSlash(TemplatePath.join(this.input));
		return TemplatePath.stripLeadingSubPath(filePath, inputDir);
	}

	getProjectPath(filePath) {
		return TemplatePath.addLeadingDotSlash(
			TemplatePath.join(".", TemplatePath.standardizeFilePath(filePath)),
		);
	}

	// Access the data without being able to set the data.
	getUserspaceInstance() {
		let d = this;

		return {
			get input() {
				return d.input;
			},
			get inputFile() {
				return d.inputFile;
			},
			get inputGlob() {
				return d.inputGlob;
			},
			get data() {
				return d.data;
			},
			get includes() {
				return d.includes;
			},
			get layouts() {
				return d.layouts;
			},
			get output() {
				return d.output;
			},
		};
	}
}

export default ProjectDirectories;
