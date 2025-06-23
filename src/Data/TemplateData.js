import path from "node:path";
import util from "node:util";
import semver from "semver";

import lodash from "@11ty/lodash-custom";
import { Merge, TemplatePath, isPlainObject } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import unique from "../Util/Objects/Unique.js";
import TemplateGlob from "../TemplateGlob.js";
import EleventyBaseError from "../Errors/EleventyBaseError.js";
import TemplateDataInitialGlobalData from "./TemplateDataInitialGlobalData.js";
import { getEleventyPackageJson, getWorkingProjectPackageJson } from "../Util/ImportJsonSync.js";
import { EleventyImport, EleventyLoadContent } from "../Util/Require.js";
import { DeepFreeze } from "../Util/Objects/DeepFreeze.js";

const { set: lodashSet, get: lodashGet } = lodash;

const debugWarn = debugUtil("Eleventy:Warnings");
const debug = debugUtil("Eleventy:TemplateData");
const debugDev = debugUtil("Dev:Eleventy:TemplateData");

class TemplateDataParseError extends EleventyBaseError {}

class TemplateData {
	constructor(templateConfig) {
		if (!templateConfig || templateConfig.constructor.name !== "TemplateConfig") {
			throw new Error(
				"Internal error: Missing `templateConfig` or was not an instance of `TemplateConfig`.",
			);
		}

		this.templateConfig = templateConfig;
		this.config = this.templateConfig.getConfig();

		this.benchmarks = {
			data: this.config.benchmarkManager.get("Data"),
			aggregate: this.config.benchmarkManager.get("Aggregate"),
		};

		this.rawImports = {};
		this.globalData = null;
		this.templateDirectoryData = {};
		this.isEsm = false;

		this.initialGlobalData = new TemplateDataInitialGlobalData(this.templateConfig);
	}

	get dirs() {
		return this.templateConfig.directories;
	}

	get inputDir() {
		return this.dirs.input;
	}

	// if this was set but `falsy` we would fallback to inputDir
	get dataDir() {
		return this.dirs.data;
	}

	get absoluteDataDir() {
		return TemplatePath.absolutePath(this.dataDir);
	}

	// This was async in 2.0 and prior but doesn’t need to be any more.
	getInputDir() {
		return this.dirs.input;
	}

	getDataDir() {
		return this.dataDir;
	}

	exists(pathname) {
		// It's common for data files not to exist, so we avoid going to the FS to
		// re-check if they do via a quick-and-dirty cache.
		return this.templateConfig.existsCache.exists(pathname);
	}

	setFileSystemSearch(fileSystemSearch) {
		this.fileSystemSearch = fileSystemSearch;
	}

	setProjectUsingEsm(isEsmProject) {
		this.isEsm = !!isEsmProject;
	}

	get extensionMap() {
		if (!this._extensionMap) {
			throw new Error("Internal error: missing `extensionMap` in TemplateData.");
		}
		return this._extensionMap;
	}

	set extensionMap(map) {
		this._extensionMap = map;
	}

	get environmentVariables() {
		return this._env;
	}

	set environmentVariables(env) {
		this._env = env;
	}

	/* Used by tests */
	_setConfig(config) {
		this.config = config;
	}

	getRawImports() {
		if (!this.config.keys.package) {
			debug(
				"Opted-out of package.json assignment for global data with falsy value for `keys.package` configuration.",
			);
			return this.rawImports;
		} else if (Object.keys(this.rawImports).length > 0) {
			return this.rawImports;
		}

		let pkgJson = getWorkingProjectPackageJson();
		this.rawImports[this.config.keys.package] = pkgJson;

		if (this.config.freezeReservedData) {
			DeepFreeze(this.rawImports);
		}

		return this.rawImports;
	}

	clearData() {
		this.globalData = null;
		this.configApiGlobalData = null;
		this.templateDirectoryData = {};
	}

	_getGlobalDataGlobByExtension(extension) {
		return TemplateGlob.normalizePath(this.dataDir, `/**/*.${extension}`);
	}

	// This is a backwards compatibility helper with the old `jsDataFileSuffix` configuration API
	getDataFileSuffixes() {
		// New API
		if (Array.isArray(this.config.dataFileSuffixes)) {
			return this.config.dataFileSuffixes;
		}

		// Backwards compatibility
		if (this.config.jsDataFileSuffix) {
			let suffixes = [];
			suffixes.push(this.config.jsDataFileSuffix); // e.g. filename.11tydata.json
			suffixes.push(""); // suffix-less for free with old API, e.g. filename.json
			return suffixes;
		}
		return []; // if both of these entries are set to false, use no files
	}

	// This is used exclusively for --watch and --serve chokidar targets
	async getTemplateDataFileGlob() {
		let suffixes = this.getDataFileSuffixes();
		let globSuffixesWithLeadingDot = new Set();
		globSuffixesWithLeadingDot.add("json"); // covers .11tydata.json too
		let globSuffixesWithoutLeadingDot = new Set();

		// Typically using [ '.11tydata', '' ] suffixes to find data files
		for (let suffix of suffixes) {
			// TODO the `suffix` truthiness check is purely for backwards compat?
			if (suffix && typeof suffix === "string") {
				if (suffix.startsWith(".")) {
					// .suffix.js
					globSuffixesWithLeadingDot.add(`${suffix.slice(1)}.mjs`);
					globSuffixesWithLeadingDot.add(`${suffix.slice(1)}.cjs`);
					globSuffixesWithLeadingDot.add(`${suffix.slice(1)}.js`);
				} else {
					// "suffix.js" without leading dot
					globSuffixesWithoutLeadingDot.add(`${suffix || ""}.mjs`);
					globSuffixesWithoutLeadingDot.add(`${suffix || ""}.cjs`);
					globSuffixesWithoutLeadingDot.add(`${suffix || ""}.js`);
				}
			}
		}

		// Configuration Data Extensions e.g. yaml
		if (this.hasUserDataExtensions()) {
			for (let extension of this.getUserDataExtensions()) {
				globSuffixesWithLeadingDot.add(extension); // covers .11tydata.{extension} too
			}
		}

		let paths = [];
		if (globSuffixesWithLeadingDot.size > 0) {
			paths.push(`${this.inputDir}**/*.{${Array.from(globSuffixesWithLeadingDot).join(",")}}`);
		}
		if (globSuffixesWithoutLeadingDot.size > 0) {
			paths.push(`${this.inputDir}**/*{${Array.from(globSuffixesWithoutLeadingDot).join(",")}}`);
		}

		return TemplatePath.addLeadingDotSlashArray(paths);
	}

	// For spidering dependencies
	// TODO Can we reuse getTemplateDataFileGlob instead? Maybe just filter off the .json files before scanning for dependencies
	getTemplateJavaScriptDataFileGlob() {
		let paths = [];
		let suffixes = this.getDataFileSuffixes();
		for (let suffix of suffixes) {
			if (suffix) {
				// TODO this check is purely for backwards compat and I kinda feel like it shouldn’t be here
				// paths.push(`${this.inputDir}/**/*${suffix || ""}.cjs`); // Same as above
				paths.push(`${this.inputDir}**/*${suffix || ""}.js`);
			}
		}

		return TemplatePath.addLeadingDotSlashArray(paths);
	}

	getGlobalDataGlob() {
		let extGlob = this.getGlobalDataExtensionPriorities().join(",");
		return [this._getGlobalDataGlobByExtension("{" + extGlob + "}")];
	}

	getWatchPathCache() {
		return this.pathCache;
	}

	getGlobalDataExtensionPriorities() {
		return this.getUserDataExtensions().concat(["json", "mjs", "cjs", "js"]);
	}

	static calculateExtensionPriority(path, priorities) {
		for (let i = 0; i < priorities.length; i++) {
			let ext = priorities[i];
			if (path.endsWith(ext)) {
				return i;
			}
		}
		return priorities.length;
	}

	async getGlobalDataFiles() {
		let priorities = this.getGlobalDataExtensionPriorities();

		let fsBench = this.benchmarks.aggregate.get("Searching the file system (data)");
		fsBench.before();
		let globs = this.getGlobalDataGlob();
		let paths = await this.fileSystemSearch.search("global-data", globs);
		fsBench.after();

		// sort paths according to extension priorities
		// here we use reverse ordering, because paths with bigger index in array will override the first ones
		// example [path/file.json, path/file.js] here js will override json
		paths = paths.sort((first, second) => {
			let p1 = TemplateData.calculateExtensionPriority(first, priorities);
			let p2 = TemplateData.calculateExtensionPriority(second, priorities);
			if (p1 < p2) {
				return -1;
			}
			if (p1 > p2) {
				return 1;
			}
			return 0;
		});

		this.pathCache = paths;
		return paths;
	}

	getObjectPathForDataFile(dataFilePath) {
		let absoluteDataFilePath = TemplatePath.absolutePath(dataFilePath);
		let reducedPath = TemplatePath.stripLeadingSubPath(absoluteDataFilePath, this.absoluteDataDir);
		let parsed = path.parse(reducedPath);
		let folders = parsed.dir ? parsed.dir.split("/") : [];
		folders.push(parsed.name);

		return folders;
	}

	async getAllGlobalData() {
		let globalData = {};
		let files = TemplatePath.addLeadingDotSlashArray(await this.getGlobalDataFiles());

		this.config.events.emit("eleventy.globalDataFiles", files);

		let dataFileConflicts = {};

		for (let j = 0, k = files.length; j < k; j++) {
			let data = await this.getDataValue(files[j]);
			let objectPathTarget = this.getObjectPathForDataFile(files[j]);

			// Since we're joining directory paths and an array is not usable as an objectkey since two identical arrays are not double equal,
			// we can just join the array by a forbidden character ("/"" is chosen here, since it works on Linux, Mac and Windows).
			// If at some point this isn't enough anymore, it would be possible to just use JSON.stringify(objectPathTarget) since that
			// is guaranteed to work but is signifivcantly slower.
			let objectPathTargetString = objectPathTarget.join(path.sep);

			// if two global files have the same path (but different extensions)
			// and conflict, let’s merge them.
			if (dataFileConflicts[objectPathTargetString]) {
				debugWarn(
					`merging global data from ${files[j]} with an already existing global data file (${dataFileConflicts[objectPathTargetString]}). Overriding existing keys.`,
				);

				let oldData = lodashGet(globalData, objectPathTarget);
				data = TemplateData.mergeDeep(this.config.dataDeepMerge, oldData, data);
			}

			dataFileConflicts[objectPathTargetString] = files[j];
			debug(`Found global data file ${files[j]} and adding as: ${objectPathTarget}`);
			lodashSet(globalData, objectPathTarget, data);
		}

		return globalData;
	}

	async #getInitialGlobalData() {
		let globalData = await this.initialGlobalData.getData();

		if (!("eleventy" in globalData)) {
			globalData.eleventy = {};
		}

		// #2293 for meta[name=generator]
		const pkg = getEleventyPackageJson();
		globalData.eleventy.version = semver.coerce(pkg.version).toString();
		globalData.eleventy.generator = `Eleventy v${globalData.eleventy.version}`;

		if (this.environmentVariables) {
			if (!("env" in globalData.eleventy)) {
				globalData.eleventy.env = {};
			}

			Object.assign(globalData.eleventy.env, this.environmentVariables);
		}

		if (this.dirs) {
			if (!("directories" in globalData.eleventy)) {
				globalData.eleventy.directories = {};
			}

			Object.assign(globalData.eleventy.directories, this.dirs.getUserspaceInstance());
		}

		// Reserved
		if (this.config.freezeReservedData) {
			DeepFreeze(globalData.eleventy);
		}

		return globalData;
	}

	async getInitialGlobalData() {
		if (!this.configApiGlobalData) {
			this.configApiGlobalData = this.#getInitialGlobalData();
		}

		return this.configApiGlobalData;
	}

	async #getGlobalData() {
		let rawImports = this.getRawImports();
		let configApiGlobalData = await this.getInitialGlobalData();

		let globalJson = await this.getAllGlobalData();
		let mergedGlobalData = Merge(globalJson, configApiGlobalData);

		// OK: Shallow merge when combining rawImports (pkg) with global data files
		return Object.assign({}, mergedGlobalData, rawImports);
	}

	async getGlobalData() {
		if (!this.globalData) {
			this.globalData = this.#getGlobalData();
		}

		return this.globalData;
	}

	/* Template and Directory data files */
	async combineLocalData(localDataPaths) {
		let localData = {};
		if (!Array.isArray(localDataPaths)) {
			localDataPaths = [localDataPaths];
		}

		// Filter out files we know don't exist to avoid overhead for checking
		localDataPaths = localDataPaths.filter((path) => {
			return this.exists(path);
		});

		this.config.events.emit("eleventy.dataFiles", localDataPaths);

		if (!localDataPaths.length) {
			return localData;
		}

		let dataSource = {};
		for (let path of localDataPaths) {
			let dataForPath = await this.getDataValue(path);
			if (!isPlainObject(dataForPath)) {
				debug(
					"Warning: Template and Directory data files expect an object to be returned, instead `%o` returned `%o`",
					path,
					dataForPath,
				);
			} else {
				// clean up data for template/directory data files only.
				let cleanedDataForPath = TemplateData.cleanupData(dataForPath, {
					file: path,
				});
				for (let key in cleanedDataForPath) {
					if (Object.prototype.hasOwnProperty.call(dataSource, key)) {
						debugWarn(
							"Local data files have conflicting data. Overwriting '%s' with data from '%s'. Previous data location was from '%s'",
							key,
							path,
							dataSource[key],
						);
					}
					dataSource[key] = path;
				}
				TemplateData.mergeDeep(this.config.dataDeepMerge, localData, cleanedDataForPath);
			}
		}
		return localData;
	}

	async getTemplateDirectoryData(templatePath) {
		if (!this.templateDirectoryData[templatePath]) {
			let localDataPaths = await this.getLocalDataPaths(templatePath);
			let importedData = await this.combineLocalData(localDataPaths);

			this.templateDirectoryData[templatePath] = importedData;
		}
		return this.templateDirectoryData[templatePath];
	}

	getUserDataExtensions() {
		if (!this.config.dataExtensions) {
			return [];
		}

		// returning extensions in reverse order to create proper extension order
		// later added formats will override first ones
		return Array.from(this.config.dataExtensions.keys()).reverse();
	}

	getUserDataParser(extension) {
		return this.config.dataExtensions.get(extension);
	}

	isUserDataExtension(extension) {
		return this.config.dataExtensions && this.config.dataExtensions.has(extension);
	}

	hasUserDataExtensions() {
		return this.config.dataExtensions && this.config.dataExtensions.size > 0;
	}

	async _parseDataFile(path, parser, options = {}) {
		let readFile = !("read" in options) || options.read === true;
		let rawInput;

		if (readFile) {
			rawInput = EleventyLoadContent(path, options);
		}

		if (readFile && !rawInput) {
			return {};
		}

		try {
			if (readFile) {
				return parser(rawInput, path);
			} else {
				// path as a first argument is when `read: false`
				// path as a second argument is for consistency with `read: true` API
				return parser(path, path);
			}
		} catch (e) {
			throw new TemplateDataParseError(`Having trouble parsing data file ${path}`, e);
		}
	}

	// ignoreProcessing = false for global data files
	// ignoreProcessing = true for local data files
	async getDataValue(path) {
		let extension = TemplatePath.getExtension(path);

		if (extension === "js" || extension === "cjs" || extension === "mjs") {
			// JS data file or require’d JSON (no preprocessing needed)
			if (!this.exists(path)) {
				return {};
			}

			let aggregateDataBench = this.benchmarks.aggregate.get("Data File");
			aggregateDataBench.before();
			let dataBench = this.benchmarks.data.get(`\`${path}\``);
			dataBench.before();

			let type = "cjs";
			if (extension === "mjs" || (extension === "js" && this.isEsm)) {
				type = "esm";
			}

			// We always need to use `import()`, as `require` isn’t available in ESM.
			let returnValue = await EleventyImport(path, type);

			// TODO special exception for Global data `permalink.js`
			// module.exports = (data) => `${data.page.filePathStem}/`; // Does not work
			// module.exports = () => ((data) => `${data.page.filePathStem}/`); // Works
			if (typeof returnValue === "function") {
				let configApiGlobalData = await this.getInitialGlobalData();
				returnValue = await returnValue(configApiGlobalData || {});
			}

			dataBench.after();
			aggregateDataBench.after();

			return returnValue;
		} else if (this.isUserDataExtension(extension)) {
			// Other extensions
			let { parser, options } = this.getUserDataParser(extension);

			return this._parseDataFile(path, parser, options);
		} else if (extension === "json") {
			// File to string, parse with JSON (preprocess)
			const parser = (content) => JSON.parse(content);
			return this._parseDataFile(path, parser);
		} else {
			throw new TemplateDataParseError(
				`Could not find an appropriate data parser for ${path}. Do you need to add a plugin to your config file?`,
			);
		}
	}

	_pushExtensionsToPaths(paths, curpath, extensions) {
		for (let extension of extensions) {
			paths.push(curpath + "." + extension);
		}
	}

	_addBaseToPaths(paths, base, extensions, nonEmptySuffixesOnly = false) {
		let suffixes = this.getDataFileSuffixes();

		for (let suffix of suffixes) {
			suffix = suffix || "";

			if (nonEmptySuffixesOnly && suffix === "") {
				continue;
			}

			// data suffix
			if (suffix) {
				paths.push(base + suffix + ".js");
				paths.push(base + suffix + ".cjs");
				paths.push(base + suffix + ".mjs");
			}
			paths.push(base + suffix + ".json"); // default: .11tydata.json

			// inject user extensions
			this._pushExtensionsToPaths(paths, base + suffix, extensions);
		}
	}

	async getLocalDataPaths(templatePath) {
		let paths = [];
		let parsed = path.parse(templatePath);
		let inputDir = this.inputDir;

		debugDev("getLocalDataPaths(%o)", templatePath);
		debugDev("parsed.dir: %o", parsed.dir);

		let userExtensions = this.getUserDataExtensions();

		if (parsed.dir) {
			let fileNameNoExt = this.extensionMap.removeTemplateExtension(parsed.base);

			// default dataSuffix: .11tydata, is appended in _addBaseToPaths
			debug("Using %o suffixes to find data files.", this.getDataFileSuffixes());

			// Template data file paths
			let filePathNoExt = parsed.dir + "/" + fileNameNoExt;
			this._addBaseToPaths(paths, filePathNoExt, userExtensions);

			// Directory data file paths
			let allDirs = TemplatePath.getAllDirs(parsed.dir);

			debugDev("allDirs: %o", allDirs);
			for (let dir of allDirs) {
				let lastDir = TemplatePath.getLastPathSegment(dir);
				let dirPathNoExt = dir + "/" + lastDir;

				if (inputDir) {
					debugDev("dirStr: %o; inputDir: %o", dir, inputDir);
				}
				// TODO use DirContains
				if (!inputDir || (dir.startsWith(inputDir) && dir !== inputDir)) {
					if (this.config.dataFileDirBaseNameOverride) {
						let indexDataFile = dir + "/" + this.config.dataFileDirBaseNameOverride;
						this._addBaseToPaths(paths, indexDataFile, userExtensions, true);
					} else {
						this._addBaseToPaths(paths, dirPathNoExt, userExtensions);
					}
				}
			}

			// 0.11.0+ include root input dir files
			// if using `docs/` as input dir, looks for docs/docs.json et al
			if (inputDir) {
				let lastInputDir = TemplatePath.addLeadingDotSlash(
					TemplatePath.join(inputDir, TemplatePath.getLastPathSegment(inputDir)),
				);

				// in root input dir, search for index.11tydata.json et al
				if (this.config.dataFileDirBaseNameOverride) {
					let indexDataFile =
						TemplatePath.getDirFromFilePath(lastInputDir) +
						"/" +
						this.config.dataFileDirBaseNameOverride;
					this._addBaseToPaths(paths, indexDataFile, userExtensions, true);
				} else if (lastInputDir !== "./") {
					this._addBaseToPaths(paths, lastInputDir, userExtensions);
				}
			}
		}

		debug("getLocalDataPaths(%o): %o", templatePath, paths);
		return unique(paths).reverse();
	}

	static mergeDeep(deepMerge, target, ...source) {
		if (!deepMerge && deepMerge !== undefined) {
			return Object.assign(target, ...source);
		} else {
			return TemplateData.merge(target, ...source);
		}
	}

	static merge(target, ...source) {
		return Merge(target, ...source);
	}

	/* Like cleanupData() but does not mutate */
	static getCleanedTagsImmutable(data, options = {}) {
		let tags = [];

		if (isPlainObject(data) && data.tags) {
			if (typeof data.tags === "string") {
				tags = (data.tags || "").split(",");
			} else if (Array.isArray(data.tags)) {
				tags = data.tags;
			} else if (data.tags) {
				throw new Error(
					`String or Array expected for \`tags\`${options.file ? ` in ${options.isVirtualTemplate ? "virtual " : ""}template: ${options.file}` : ""}. Received: ${util.inspect(data.tags)}`,
				);
			}

			// Deduplicate tags
			// Coerce to string #3875
			return [...new Set(tags)].map((entry) => String(entry));
		}

		return tags;
	}

	static cleanupData(data, options = {}) {
		if (isPlainObject(data) && "tags" in data) {
			data.tags = this.getCleanedTagsImmutable(data, options);
		}

		return data;
	}

	static getNormalizedExcludedCollections(data) {
		let excludes = [];
		let key = "eleventyExcludeFromCollections";

		if (data?.[key] !== true) {
			if (Array.isArray(data[key])) {
				excludes = data[key];
			} else if (typeof data[key] === "string") {
				excludes = (data[key] || "").split(",");
			}
		}

		return {
			excludes,
			excludeAll: data?.eleventyExcludeFromCollections === true,
		};
	}

	static getIncludedCollectionNames(data) {
		let tags = TemplateData.getCleanedTagsImmutable(data);

		let { excludes, excludeAll } = TemplateData.getNormalizedExcludedCollections(data);
		if (excludeAll) {
			return [];
		}

		return ["all", ...tags].filter((tag) => !excludes.includes(tag));
	}

	static getIncludedTagNames(data) {
		return this.getIncludedCollectionNames(data).filter((tagName) => tagName !== "all");
	}
}

export default TemplateData;
