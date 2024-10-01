import EleventyExtensionMap from "../EleventyExtensionMap.js";
import EleventyBaseError from "../Errors/EleventyBaseError.js";

class TemplateEngineConfigError extends EleventyBaseError {}

class TemplateEngine {
	constructor(name, eleventyConfig) {
		this.name = name;

		this.engineLib = null;
		this.cacheable = false;

		if (!eleventyConfig) {
			throw new TemplateEngineConfigError("Missing `eleventyConfig` argument.");
		}
		this.eleventyConfig = eleventyConfig;
	}

	get dirs() {
		return this.eleventyConfig.directories;
	}

	get inputDir() {
		return this.dirs.input;
	}

	get includesDir() {
		return this.dirs.includes;
	}

	get config() {
		if (this.eleventyConfig.constructor.name !== "TemplateConfig") {
			throw new Error("Expecting a TemplateConfig instance.");
		}

		return this.eleventyConfig.getConfig();
	}

	get benchmarks() {
		if (!this._benchmarks) {
			this._benchmarks = {
				aggregate: this.config.benchmarkManager.get("Aggregate"),
			};
		}
		return this._benchmarks;
	}

	get engineManager() {
		return this._engineManager;
	}

	set engineManager(manager) {
		this._engineManager = manager;
	}

	get extensionMap() {
		if (!this._extensionMap) {
			this._extensionMap = new EleventyExtensionMap(this.eleventyConfig);
			this._extensionMap.setFormats([]);
		}
		return this._extensionMap;
	}

	set extensionMap(map) {
		this._extensionMap = map;
	}

	get extensions() {
		if (!this._extensions) {
			this._extensions = this.extensionMap.getExtensionsFromKey(this.name);
		}
		return this._extensions;
	}

	get extensionEntries() {
		if (!this._extensionEntries) {
			this._extensionEntries = this.extensionMap.getExtensionEntriesFromKey(this.name);
		}
		return this._extensionEntries;
	}

	getName() {
		return this.name;
	}

	// Backwards compat
	getIncludesDir() {
		return this.includesDir;
	}

	/**
	 * @protected
	 */
	setEngineLib(engineLib) {
		this.engineLib = engineLib;

		// Run engine amendments (via issue #2438)
		for (let amendment of this.config.libraryAmendments[this.name] || []) {
			// TODO it’d be nice if this were async friendly
			amendment(engineLib);
		}
	}

	getEngineLib() {
		return this.engineLib;
	}

	async _testRender(str, data) {
		// @ts-ignore
		let fn = await this.compile(str);
		return fn(data);
	}

	useJavaScriptImport() {
		return false;
	}

	// JavaScript files defer to the module loader rather than read the files to strings
	needsToReadFileContents() {
		return true;
	}

	getExtraDataFromFile() {
		return {};
	}

	getCompileCacheKey(str, inputPath) {
		// Changing to use inputPath and contents, using only file contents (`str`) caused issues when two
		// different files had identical content (2.0.0-canary.16)

		// Caches are now segmented based on inputPath so using inputPath here is superfluous (2.0.0-canary.19)
		// But we do want a non-falsy value here even if `str` is an empty string.
		return {
			useCache: true,
			key: inputPath + str,
		};
	}

	get defaultTemplateFileExtension() {
		return "html";
	}

	// Whether or not to wrap in Eleventy layouts
	useLayouts() {
		return true;
	}

	/** @returns {boolean|undefined} */
	permalinkNeedsCompilation(str) {
		return this.needsCompilation();
	}

	// whether or not compile is needed or can we return the plaintext?
	needsCompilation(str) {
		return true;
	}

	/**
	 * Make sure compile is implemented downstream.
	 * @abstract
	 * @return {Promise}
	 */
	async compile() {
		throw new Error("compile() must be implemented by engine");
	}

	// See https://v3.11ty.dev/docs/watch-serve/#watch-javascript-dependencies
	static shouldSpiderJavaScriptDependencies() {
		return false;
	}

	hasDependencies(inputPath) {
		if (this.config.uses.getDependencies(inputPath) === false) {
			return false;
		}
		return true;
	}

	isFileRelevantTo(inputPath, comparisonFile) {
		return this.config.uses.isFileRelevantTo(inputPath, comparisonFile);
	}
}

export default TemplateEngine;
