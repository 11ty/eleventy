import fs from "node:fs";

import { TemplatePath, isPlainObject } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import TemplateData from "./Data/TemplateData.js";
import TemplateGlob from "./TemplateGlob.js";
import checkPassthroughCopyBehavior from "./Util/PassthroughCopyBehaviorCheck.js";

const debug = debugUtil("Eleventy:EleventyFiles");

class EleventyFiles {
	#extensionMap;

	constructor(formats, templateConfig) {
		if (!templateConfig) {
			throw new Error("Internal error: Missing `templateConfig`` argument.");
		}

		this.templateConfig = templateConfig;
		this.config = templateConfig.getConfig();
		this.aggregateBench = this.config.benchmarkManager.get("Aggregate");

		this.formats = formats;
		this.eleventyIgnoreContent = false;
	}

	get dirs() {
		return this.templateConfig.directories;
	}

	get inputDir() {
		return this.dirs.input;
	}

	get outputDir() {
		return this.dirs.output;
	}

	get includesDir() {
		return this.dirs.includes;
	}

	get layoutsDir() {
		return this.dirs.layouts;
	}

	get dataDir() {
		return this.dirs.data;
	}

	// Backwards compat
	getDataDir() {
		return this.dataDir;
	}

	setFileSystemSearch(fileSystemSearch) {
		this.fileSystemSearch = fileSystemSearch;
	}

	init() {
		if (this.dirs.inputFile || this.dirs.inputGlob) {
			this.templateGlobs = TemplateGlob.map([this.dirs.inputFile || this.dirs.inputGlob]);
		} else {
			// Input is a directory
			this.templateGlobs = this.extensionMap.getGlobs(this.inputDir);
		}

		this.setupGlobs();
	}

	get validTemplateGlobs() {
		if (!this._validTemplateGlobs) {
			let globs;
			// Input is a file
			if (this.inputFile) {
				globs = this.templateGlobs;
			} else {
				// input is a directory
				globs = this.extensionMap.getValidGlobs(this.inputDir);
			}
			this._validTemplateGlobs = globs;
		}
		return this._validTemplateGlobs;
	}

	get passthroughGlobs() {
		let paths = new Set();
		// stuff added in addPassthroughCopy()
		for (let path of this.passthroughManager.getConfigPathGlobs()) {
			paths.add(path);
		}
		// non-template language extensions
		for (let path of this.extensionMap.getPassthroughCopyGlobs(this.inputDir)) {
			paths.add(path);
		}
		return Array.from(paths);
	}

	restart() {
		this.setupGlobs();
		this._glob = null;
	}

	/* For testing */
	_setConfig(config) {
		if (!config.ignores) {
			config.ignores = new Set();
			config.ignores.add("**/node_modules/**");
		}

		this.config = config;

		this.init();
	}

	/* Set command root for local project paths */
	// This is only used by tests
	_setLocalPathRoot(dir) {
		this.localPathRoot = dir;
	}

	set extensionMap(extensionMap) {
		this.#extensionMap = extensionMap;
	}

	get extensionMap() {
		// for tests
		if (!this.#extensionMap) {
			throw new Error("Internal error: missing `extensionMap` in EleventyFiles.");
		}
		return this.#extensionMap;
	}

	setRunMode(runMode) {
		this.runMode = runMode;
	}

	setPassthroughManager(mgr) {
		this.passthroughManager = mgr;
	}

	set templateData(templateData) {
		this._templateData = templateData;
	}

	get templateData() {
		if (!this._templateData) {
			this._templateData = new TemplateData(this.templateConfig);
		}

		return this._templateData;
	}

	setupGlobs() {
		this.fileIgnores = this.getIgnores();
		this.extraIgnores = this._getIncludesAndDataDirs();
		this.uniqueIgnores = this.getIgnoreGlobs();

		// Conditional added for tests that don’t have a config
		if (this.config?.events) {
			this.config.events.emit("eleventy.ignores", this.uniqueIgnores);
		}

		this.normalizedTemplateGlobs = this.templateGlobs;
	}

	getIgnoreGlobs() {
		let uniqueIgnores = new Set();
		for (let ignore of this.fileIgnores) {
			uniqueIgnores.add(ignore);
		}
		for (let ignore of this.extraIgnores) {
			uniqueIgnores.add(ignore);
		}
		// Placing the config ignores last here is important to the tests
		for (let ignore of this.config.ignores) {
			uniqueIgnores.add(TemplateGlob.normalizePath(this.localPathRoot || ".", ignore));
		}
		return Array.from(uniqueIgnores);
	}

	static getFileIgnores(ignoreFiles) {
		if (!Array.isArray(ignoreFiles)) {
			ignoreFiles = [ignoreFiles];
		}

		let ignores = [];
		for (let ignorePath of ignoreFiles) {
			ignorePath = TemplatePath.normalize(ignorePath);

			let dir = TemplatePath.getDirFromFilePath(ignorePath);

			if (fs.existsSync(ignorePath) && fs.statSync(ignorePath).size > 0) {
				let ignoreContent = fs.readFileSync(ignorePath, "utf8");

				ignores = ignores.concat(EleventyFiles.normalizeIgnoreContent(dir, ignoreContent));
			}
		}

		ignores.forEach((path) => debug(`${ignoreFiles} ignoring: ${path}`));

		return ignores;
	}

	static normalizeIgnoreContent(dir, ignoreContent) {
		let ignores = [];

		if (ignoreContent) {
			ignores = ignoreContent
				.split("\n")
				.map((line) => {
					return line.trim();
				})
				.filter((line) => {
					if (line.charAt(0) === "!") {
						debug(
							">>> When processing .gitignore/.eleventyignore, Eleventy does not currently support negative patterns but encountered one:",
						);
						debug(">>>", line);
						debug("Follow along at https://github.com/11ty/eleventy/issues/693 to track support.");
					}

					// empty lines or comments get filtered out
					return line.length > 0 && line.charAt(0) !== "#" && line.charAt(0) !== "!";
				})
				.map((line) => {
					let path = TemplateGlob.normalizePath(dir, "/", line);
					path = TemplatePath.addLeadingDotSlash(TemplatePath.relativePath(path));

					try {
						// Note these folders must exist to get /** suffix
						let stat = fs.statSync(path);
						if (stat.isDirectory()) {
							return path + "/**";
						}
						return path;
					} catch (e) {
						return path;
					}
				});
		}

		return ignores;
	}

	/* Tests only */
	_setEleventyIgnoreContent(content) {
		this.eleventyIgnoreContent = content;
	}

	getIgnores() {
		let files = new Set();

		for (let ignore of EleventyFiles.getFileIgnores(this.getIgnoreFiles())) {
			files.add(ignore);
		}

		// testing API
		if (this.eleventyIgnoreContent !== false) {
			files.add(this.eleventyIgnoreContent);
		}

		// ignore output dir (unless this excludes all input)
		// input: . and output: . (skip)
		// input: ./content and output . (skip)
		// input: . and output: ./_site (add)
		if (!this.inputDir.startsWith(this.outputDir)) {
			// both are already normalized in 3.0
			files.add(TemplateGlob.map(this.outputDir + "/**"));
		}

		return Array.from(files);
	}

	getIgnoreFiles() {
		let ignoreFiles = new Set();
		let rootDirectory = this.localPathRoot || ".";

		if (this.config.useGitIgnore) {
			ignoreFiles.add(TemplatePath.join(rootDirectory, ".gitignore"));
		}

		if (this.eleventyIgnoreContent === false) {
			let absoluteInputDir = TemplatePath.absolutePath(this.inputDir);
			ignoreFiles.add(TemplatePath.join(rootDirectory, ".eleventyignore"));
			if (rootDirectory !== absoluteInputDir) {
				ignoreFiles.add(TemplatePath.join(this.inputDir, ".eleventyignore"));
			}
		}

		return Array.from(ignoreFiles);
	}

	/* Backwards compat */
	getIncludesDir() {
		return this.includesDir;
	}

	/* Backwards compat */
	getLayoutsDir() {
		return this.layoutsDir;
	}

	getFileGlobs() {
		return this.normalizedTemplateGlobs;
	}

	getRawFiles() {
		return this.templateGlobs;
	}

	async getWatchPathCache() {
		// Issue #1325: make sure passthrough copy files are not included here
		if (!this.pathCache) {
			throw new Error("Watching requires `.getFiles()` to be called first in EleventyFiles");
		}

		let ret = [];
		// Filter out the passthrough copy paths.
		for (let path of this.pathCache) {
			if (
				this.extensionMap.isFullTemplateFilePath(path) &&
				(await this.extensionMap.shouldSpiderJavaScriptDependencies(path))
			) {
				ret.push(path);
			}
		}
		return ret;
	}

	_globSearch() {
		let globs = this.getFileGlobs();

		// returns a promise
		debug("Searching for: %o", globs);
		return this.fileSystemSearch.search("templates", globs, {
			ignore: this.uniqueIgnores,
		});
	}

	getPathsWithVirtualTemplates(paths) {
		// Support for virtual templates added in 3.0
		if (this.config.virtualTemplates && isPlainObject(this.config.virtualTemplates)) {
			let virtualTemplates = Object.keys(this.config.virtualTemplates)
				.filter((path) => {
					// Filter out includes/layouts
					return this.dirs.isTemplateFile(path);
				})
				.map((path) => {
					let fullVirtualPath = this.dirs.getInputPath(path);
					if (!this.extensionMap.getKey(fullVirtualPath)) {
						this.templateConfig.logger.warn(
							`The virtual template at ${fullVirtualPath} is using a template format that’s not valid for your project. Your project is using: "${this.formats}". Read more about formats: https://v3.11ty.dev/docs/config/#template-formats`,
						);
					}
					return fullVirtualPath;
				});

			paths = paths.concat(virtualTemplates);

			// Virtual templates can not live at the same place as files on the file system!
			if (paths.length !== new Set(paths).size) {
				let conflicts = {};
				for (let path of paths) {
					if (conflicts[path]) {
						throw new Error(
							`A virtual template had the same path as a file on the file system: "${path}"`,
						);
					}

					conflicts[path] = true;
				}
			}
		}

		return paths;
	}

	async getFiles() {
		let bench = this.aggregateBench.get("Searching the file system (templates)");
		bench.before();
		let globResults = await this._globSearch();
		let paths = TemplatePath.addLeadingDotSlashArray(globResults);
		bench.after();

		// Note 2.0.0-canary.19 removed a `filter` option for custom template syntax here that was unpublished and unused.

		paths = this.getPathsWithVirtualTemplates(paths);

		this.pathCache = paths;
		return paths;
	}

	getFileShape(paths, filePath) {
		if (!filePath) {
			return;
		}
		if (this.isPassthroughCopyFile(paths, filePath)) {
			return "copy";
		}
		if (this.isFullTemplateFile(paths, filePath)) {
			return "template";
		}
		// include/layout/unknown
	}

	isPassthroughCopyFile(paths, filePath) {
		return this.passthroughManager.isPassthroughCopyFile(paths, filePath);
	}

	// Assumption here that filePath is not a passthrough copy file
	isFullTemplateFile(paths, filePath) {
		if (!filePath) {
			return false;
		}

		for (let path of paths) {
			if (path === filePath) {
				return true;
			}
		}

		return false;
	}

	/* For `eleventy --watch` */
	getGlobWatcherFiles() {
		// TODO improvement: tie the includes and data to specific file extensions (currently using `**`)
		let directoryGlobs = this._getIncludesAndDataDirs();

		if (checkPassthroughCopyBehavior(this.config, this.runMode)) {
			return this.validTemplateGlobs.concat(directoryGlobs);
		}

		// Revert to old passthroughcopy copy files behavior
		return this.validTemplateGlobs.concat(this.passthroughGlobs).concat(directoryGlobs);
	}

	/* For `eleventy --watch` */
	getGlobWatcherFilesForPassthroughCopy() {
		return this.passthroughGlobs;
	}

	/* For `eleventy --watch` */
	async getGlobWatcherTemplateDataFiles() {
		let templateData = this.templateData;
		return await templateData.getTemplateDataFileGlob();
	}

	/* For `eleventy --watch` */
	// TODO this isn’t great but reduces complexity avoiding using TemplateData:getLocalDataPaths for each template in the cache
	async getWatcherTemplateJavaScriptDataFiles() {
		let globs = this.templateData.getTemplateJavaScriptDataFileGlob();
		let bench = this.aggregateBench.get("Searching the file system (watching)");
		bench.before();
		let results = TemplatePath.addLeadingDotSlashArray(
			await this.fileSystemSearch.search("js-dependencies", globs, {
				ignore: ["**/node_modules/**"],
			}),
		);
		bench.after();
		return results;
	}

	/* Ignored by `eleventy --watch` */
	getGlobWatcherIgnores() {
		// convert to format without ! since they are passed in as a separate argument to glob watcher
		let entries = new Set(
			this.fileIgnores.map((ignore) => TemplatePath.stripLeadingDotSlash(ignore)),
		);

		for (let ignore of this.config.watchIgnores) {
			entries.add(TemplateGlob.normalizePath(this.localPathRoot || ".", ignore));
		}

		// de-duplicated
		return Array.from(entries);
	}

	_getIncludesAndDataDirs() {
		let rawPaths = new Set();
		rawPaths.add(this.includesDir);
		if (this.layoutsDir) {
			rawPaths.add(this.layoutsDir);
		}
		rawPaths.add(this.dataDir);

		return Array.from(rawPaths)
			.filter((entry) => {
				// never ignore the input directory (even if config file returns "" for these)
				return entry && entry !== this.inputDir;
			})
			.map((entry) => {
				return TemplateGlob.map(entry + "**");
			});
	}
}

export default EleventyFiles;
