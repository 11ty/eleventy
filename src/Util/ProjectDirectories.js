import fs from "node:fs";
import { TemplatePath } from "@11ty/eleventy-utils";

/* Directories internally should always use *nix forward slashes */
class ProjectDirectories {
	#raw = {};

	#defaults = {
		input: "./",
		data: "./_data/",
		includes: "./_includes/",
		layouts: "./_layouts/",
		output: "./_site/",
	};

	#dirs = {};

	// Must be a directory
	// Use forward slashes
	// Always include a trailing slash
	static normalizeDirectory(dir) {
		return ProjectDirectories.addTrailingSlash(TemplatePath.standardizeFilePath(dir));
	}

	static addTrailingSlash(path) {
		if (path.slice(-1) === "/") {
			return path;
		}
		return path + "/";
	}

	updateInputDependencies() {
		// raw first, fall back to Eleventy defaults if not yet set
		this.setData(this.#raw.data || this.#defaults.data);
		this.setIncludes(this.#raw.includes || this.#defaults.includes);
		this.setLayouts(this.#raw.layouts || this.#defaults.layouts);
	}

	setInputDir(inputDir) {
		this.#dirs.input = ProjectDirectories.normalizeDirectory(inputDir);
		this.updateInputDependencies();
	}

	/* Relative to project root, must exist */
	setInput(dirOrFile, inputDir = undefined) {
		if (!dirOrFile) {
			return;
		}

		this.#raw.input = dirOrFile;

		// Explicit input dir (may or may not exist)
		if (inputDir) {
			this.#dirs.input = ProjectDirectories.normalizeDirectory(inputDir);
		} else {
			// Must exist
			if (!fs.existsSync(dirOrFile)) {
				throw new Error("Input directory or file must exist.");
			}

			if (fs.statSync(dirOrFile).isDirectory()) {
				this.#dirs.input = ProjectDirectories.normalizeDirectory(dirOrFile);
			} else {
				// is an input file that exists
				// the input directory is implied to be the parent directory of the
				// file, unless inputDir is explicitly specified (via Eleventy `options` argument)
				this.#dirs.input = ProjectDirectories.normalizeDirectory(
					TemplatePath.getDirFromFilePath(dirOrFile),
				);
			}
		}

		this.updateInputDependencies();
	}

	/* Relative to input dir */
	setIncludes(dir) {
		if (dir) {
			this.#raw.includes = dir;
			this.#dirs.includes = ProjectDirectories.normalizeDirectory(
				TemplatePath.join(this.input, dir),
			);
		}
	}

	/* Relative to input dir */
	/* Optional */
	setLayouts(dir) {
		if (dir) {
			this.#raw.layouts = dir;
			this.#dirs.layouts = ProjectDirectories.normalizeDirectory(
				TemplatePath.join(this.input, dir),
			);
		}
	}

	/* Relative to input dir */
	setData(dir) {
		if (dir) {
			this.#raw.data = dir;
			this.#dirs.data = ProjectDirectories.normalizeDirectory(TemplatePath.join(this.input, dir));
		}
	}

	/* Relative to project root */
	setOutput(dir) {
		if (dir) {
			this.#raw.output = dir;
			this.#dirs.output = ProjectDirectories.normalizeDirectory(dir);
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
		return this.#dirs.layouts || this.#defaults.layouts;
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
}

export default ProjectDirectories;
