import util from "node:util";
import path from "node:path";
import fs from "graceful-fs";

import isGlob from "is-glob";
import copy from "@11ty/recursive-copy";
import { TemplatePath } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import EleventyBaseError from "./Errors/EleventyBaseError.js";
import checkPassthroughCopyBehavior from "./Util/PassthroughCopyBehaviorCheck.js";
import ProjectDirectories from "./Util/ProjectDirectories.js";

const fsExists = util.promisify(fs.exists);

const debug = debugUtil("Eleventy:TemplatePassthrough");

class TemplatePassthroughError extends EleventyBaseError {}

class TemplatePassthrough {
	#isExistsCache = {};
	#isDirectoryCache = {};

	constructor(path, eleventyConfig) {
		if (!eleventyConfig || eleventyConfig.constructor.name !== "TemplateConfig") {
			throw new TemplatePassthroughError(
				"Missing `eleventyConfig` or was not an instance of `TemplateConfig`.",
			);
		}
		this.eleventyConfig = eleventyConfig;

		this.benchmarks = {
			aggregate: this.config.benchmarkManager.get("Aggregate"),
		};

		this.rawPath = path;

		// inputPath is relative to the root of your project and not your Eleventy input directory.
		// TODO normalize these with forward slashes
		this.inputPath = this.normalizeDirectory(path.inputPath);
		this.isInputPathGlob = isGlob(this.inputPath);

		this.outputPath = path.outputPath;

		this.copyOptions = path.copyOptions; // custom options for recursive-copy

		this.isDryRun = false;
		this.isIncremental = false;
	}

	get config() {
		return this.eleventyConfig.getConfig();
	}

	get dirs() {
		return this.eleventyConfig.directories;
	}

	// inputDir is used when stripping from output path in `getOutputPath`
	get inputDir() {
		return this.dirs.input;
	}

	get outputDir() {
		return this.dirs.output;
	}

	/* { inputPath, outputPath } though outputPath is *not* the full path: just the output directory */
	getPath() {
		return this.rawPath;
	}

	async getOutputPath(inputFileFromGlob) {
		let { inputDir, outputDir, outputPath, inputPath } = this;

		if (outputPath === true) {
			// no explicit target, implied target
			if (this.isDirectory(inputPath)) {
				let inputRelativePath = TemplatePath.stripLeadingSubPath(
					inputFileFromGlob || inputPath,
					inputDir,
				);
				return ProjectDirectories.normalizeDirectory(
					TemplatePath.join(outputDir, inputRelativePath),
				);
			}

			return TemplatePath.normalize(
				TemplatePath.join(
					outputDir,
					TemplatePath.stripLeadingSubPath(inputFileFromGlob || inputPath, inputDir),
				),
			);
		}

		if (inputFileFromGlob) {
			return this.getOutputPathForGlobFile(inputFileFromGlob);
		}

		// Has explicit target

		// Bug when copying incremental file overwriting output directory (and making it a file)
		// e.g. public/test.css -> _site
		// https://github.com/11ty/eleventy/issues/2278
		let fullOutputPath = TemplatePath.normalize(TemplatePath.join(outputDir, outputPath));
		if (outputPath === "" || this.isDirectory(inputPath)) {
			fullOutputPath = ProjectDirectories.normalizeDirectory(fullOutputPath);
		}

		// TODO room for improvement here:
		if (
			!this.isInputPathGlob &&
			(await fsExists(inputPath)) &&
			!this.isDirectory(inputPath) &&
			this.isDirectory(fullOutputPath)
		) {
			let filename = path.parse(inputPath).base;
			return TemplatePath.normalize(TemplatePath.join(fullOutputPath, filename));
		}

		return fullOutputPath;
	}

	async getOutputPathForGlobFile(inputFileFromGlob) {
		return TemplatePath.join(
			await this.getOutputPath(),
			TemplatePath.getLastPathSegment(inputFileFromGlob),
		);
	}

	setDryRun(isDryRun) {
		this.isDryRun = !!isDryRun;
	}

	setRunMode(runMode) {
		this.runMode = runMode;
	}

	setIsIncremental(isIncremental) {
		this.isIncremental = isIncremental;
	}

	setFileSystemSearch(fileSystemSearch) {
		this.fileSystemSearch = fileSystemSearch;
	}

	async getFiles(glob) {
		debug("Searching for: %o", glob);
		let b = this.benchmarks.aggregate.get("Searching the file system (passthrough)");
		b.before();
		let files = TemplatePath.addLeadingDotSlashArray(
			await this.fileSystemSearch.search("passthrough", glob),
		);
		b.after();
		return files;
	}

	isExists(dir) {
		if (this.#isExistsCache[dir] === undefined) {
			this.#isExistsCache[dir] = fs.existsSync(dir);
		}
		return this.#isExistsCache[dir];
	}

	isDirectory(dir) {
		if (this.#isDirectoryCache[dir] === undefined) {
			if (isGlob(this.inputPath)) {
				this.#isDirectoryCache[dir] = false;
			} else if (!this.isExists(dir)) {
				this.#isDirectoryCache[dir] = false;
			} else if (fs.statSync(dir).isDirectory()) {
				this.#isDirectoryCache[dir] = true;
			} else {
				this.#isDirectoryCache[dir] = false;
			}
		}

		return this.#isDirectoryCache[dir];
	}

	// dir is guaranteed to exist by context
	// dir may not be a directory
	normalizeDirectory(dir) {
		if (dir && typeof dir === "string") {
			if (dir.endsWith(path.sep) || dir.endsWith("/")) {
				return dir;
			}

			// When inputPath is a directory, make sure it has a slash for passthrough copy aliasing
			// https://github.com/11ty/eleventy/issues/2709
			if (this.isDirectory(dir)) {
				return `${dir}/`;
			}
		}

		return dir;
	}

	// maps input paths to output paths
	async getFileMap() {
		// TODO VirtualFileSystem candidate
		if (!isGlob(this.inputPath) && this.isExists(this.inputPath)) {
			return [
				{
					inputPath: this.inputPath,
					outputPath: await this.getOutputPath(),
				},
			];
		}

		let paths = [];
		// If not directory or file, attempt to get globs
		let files = await this.getFiles(this.inputPath);
		for (let filePathFromGlob of files) {
			paths.push({
				inputPath: filePathFromGlob,
				outputPath: await this.getOutputPath(filePathFromGlob),
			});
		}

		return paths;
	}

	/* Types:
	 * 1. via glob, individual files found
	 * 2. directory, triggers an event for each file
	 * 3. individual file
	 */
	async copy(src, dest, copyOptions) {
		if (
			!TemplatePath.stripLeadingDotSlash(dest).startsWith(
				TemplatePath.stripLeadingDotSlash(this.outputDir),
			)
		) {
			return Promise.reject(
				new TemplatePassthroughError(
					"Destination is not in the site output directory. Check your passthrough paths.",
				),
			);
		}

		let fileCopyCount = 0;
		let fileSizeCount = 0;
		let map = {};
		let b = this.benchmarks.aggregate.get("Passthrough Copy File");
		// returns a promise
		return copy(src, dest, copyOptions)
			.on(copy.events.COPY_FILE_START, (copyOp) => {
				// Access to individual files at `copyOp.src`
				debug("Copying individual file %o", copyOp.src);
				map[copyOp.src] = copyOp.dest;
				b.before();
			})
			.on(copy.events.COPY_FILE_COMPLETE, (copyOp) => {
				fileCopyCount++;
				fileSizeCount += copyOp.stats.size;
				b.after();
			})
			.then(() => {
				return {
					count: fileCopyCount,
					size: fileSizeCount,
					map,
				};
			});
	}

	async write() {
		if (this.isDryRun) {
			return Promise.resolve({
				count: 0,
				map: {},
			});
		}

		debug("Copying %o", this.inputPath);
		let fileMap = await this.getFileMap();

		// default options for recursive-copy
		// see https://www.npmjs.com/package/recursive-copy#arguments
		let copyOptionsDefault = {
			overwrite: true, // overwrite output. fails when input is directory (mkdir) and output is file
			dot: true, // copy dotfiles
			junk: false, // copy cache files like Thumbs.db
			results: false,
			expand: false, // follow symlinks (matches recursive-copy default)
			debug: false, // (matches recursive-copy default)

			// Note: `filter` callback function only passes in a relative path, which is unreliable
			// See https://github.com/timkendrick/recursive-copy/blob/4c9a8b8a4bf573285e9c4a649a30a2b59ccf441c/lib/copy.js#L59
			// e.g. `{ filePaths: [ './img/coolkid.jpg' ], relativePaths: [ '' ] }`
		};

		let copyOptions = Object.assign(copyOptionsDefault, this.copyOptions);

		let promises = fileMap.map((entry) => {
			// For-free passthrough copy
			if (checkPassthroughCopyBehavior(this.config, this.runMode)) {
				let aliasMap = {};
				aliasMap[entry.inputPath] = entry.outputPath;

				return Promise.resolve({
					count: 0,
					map: aliasMap,
				});
			}

			// Copy the files (only in build mode)
			return this.copy(entry.inputPath, entry.outputPath, copyOptions);
		});

		// IMPORTANT: this returns an array of promises, does not await for promise to finish
		return Promise.all(promises).then(
			(results) => {
				// collate the count and input/output map results from the array.
				let count = 0;
				let size = 0;
				let map = {};

				for (let result of results) {
					count += result.count;
					size += result.size;
					Object.assign(map, result.map);
				}

				return {
					count,
					size,
					map,
				};
			},
			(err) => {
				throw new TemplatePassthroughError(`Error copying passthrough files: ${err.message}`, err);
			},
		);
	}
}

export default TemplatePassthrough;
