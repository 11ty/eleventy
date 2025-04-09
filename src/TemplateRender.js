/**
 * TemplateRender formerly stored a template engine. In the case that the template engine
 * was markdown or html, a preprocessor template engine could be used to parse the template.
 *
 * After the rewrite, TemplateRender stores an infinite number of template engines
 * and as part of the render process, each engine is called in sequence to render the template.
 *
 * Deleted methods:
 *
 * - getEngineName & getEngine → getEngines && getEngineNames
 * - getReadableEnginesListDifferingFromFileExtension → getReadableEnginesList
 * - isEngine: reimplement in test
 * - setMarkdownEngine & setHtmlEngine & setUseMarkdown
 *
 * In some cases, code elsewhere in 11ty assumes there is a single engine. While this is generally not desirable,
 * sometimes there is not a better option, like for permalinks. Thus, in this case, the first engine is the "primary engine"
 */

import debugUtil from "debug";
const debug = debugUtil("Eleventy:TemplateRender");
import EleventyBaseError from "./Errors/EleventyBaseError.js";

// import debugUtil from "debug";
// const debug = debugUtil("Eleventy:TemplateRender");

class TemplateRenderUnknownEngineError extends EleventyBaseError {}

// works with full path names or short engine name
class TemplateRender {
	/**
	 * @type {import('./EleventyExtensionMap.js').default | undefined}
	 */
	#extensionMap
	#config;
	/**
	 * @type {import('./Engines/TemplateEngine.js').default[] | undefined}
	 */
	#engines;
	/**
	 * @type {string[] | undefined}
	 */
	#engineNames;

	constructor(tmplPath, config) {
		if (!tmplPath) {
			throw new Error(`TemplateRender requires a tmplPath argument, instead of ${tmplPath}`);
		}
		this.#setConfig(config);

		this.engineNameOrPath = tmplPath;
	}

	#setConfig(config) {
		if (config?.constructor?.name !== "TemplateConfig") {
			throw new Error("TemplateRender must receive a TemplateConfig instance.");
		}

		this.eleventyConfig = config;
		this.config = config.getConfig();
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
		return this.#config;
	}

	/**
	 * @deprecated get engines[0] instead
	 */
	get engine() {
		debug("engine getter was called");
		if (!this.#engines) {
			throw new Error("Internal error: missing `engines` in TemplateRender.");
		}
		return this.#engines[0];
	}

	/**
	 * @deprecated get engineNames[0] instead
	 */
	get engineName() {
		debug("engineName getter was called");
		if (!this.#engineNames) {
			throw new Error("Internal error: missing `engineNames` in TemplateRender.");
		}
		return this.#engineNames[0];
	}

	set config(config) {
		this.#config = config;
	}

	set extensionMap(extensionMap) {
		this.#extensionMap = extensionMap;
	}

	get engineNames() {
		if (!this.#engineNames) {
			throw new Error("Internal error: missing `engineNames` in TemplateRender.");
		}
		return this.#engineNames;
	}

	get engines() {
		if (!this.#engines) {
			throw new Error("Internal error: missing `engines` in TemplateRender.");
		}
		return this.#engines;
	}

	get extensionMap() {
		if (!this.#extensionMap) {
			throw new Error("Internal error: missing `extensionMap` in TemplateRender.");
		}
		return this.#extensionMap;
	}

	async getEngineByName(name) {
		// WARNING: eleventyConfig assignment removed here
		return this.extensionMap.engineManager.getEngine(name, this.extensionMap);
	}

	// Runs once per template
	/**
	 *
	 * @param {string} engineNameOrPath
	 */
	async init(engineNameOrPath) {
		if (!engineNameOrPath) {
			engineNameOrPath = this.engineNameOrPath;
		}
		// if it doesn't include a comma, it may be a path or an engine name like 'md'
		// it is possible that once resolved it resolves to multiple, like 'njk', 'md' because of an override
		if (!engineNameOrPath.includes(",")) {
			const name = engineNameOrPath || this.engineNameOrPath;
			this.extensionMap.setTemplateConfig(this.eleventyConfig);

			const extensionEntry = this.extensionMap.getExtensionEntry(name);
			const engineName = extensionEntry?.aliasKey || extensionEntry?.key;

			if (typeof engineName === 'string') {
				this.#engineNames = [engineName];
			} else {
				this.#engineNames = engineName;
			}
			this.#engines = await Promise.all(this.engineNames.map(async (engineName) => {
				if (!engineName) {
					throw new TemplateRenderUnknownEngineError(`Template engine name not found for ${engineName}`);
				}
				return await this.getEngineByName(engineName)
			}))
			return
		}
		const overrides = TemplateRender.parseEngineOverrides(engineNameOrPath);
		this.#engineNames = overrides;
		this.#engines = overrides.map((engineName) => {
			if (!engineName) {
				throw new TemplateRenderUnknownEngineError(`Template engine name not found for ${engineName}`);
			}
			return this.getEngineByName(engineName)
		});
	}

	/**
	 * a simple function to parse a templateEngineOverride frontmatter
	 * @example parseEngineOverrides("njk,md,html") == ["njk","md"]
	 * @param {string} engineName
	 */
	static parseEngineOverrides(engineName) {
		if (typeof (engineName || "") !== "string") {
			throw new Error(`Expected String passed to parseEngineOverrides. Received: ${engineName}`);
		}
		return engineName
			.split(",")
			.map((name) => name.toLowerCase().trim())
			.filter(name => name && name !== "html")
	}

	// used for error logging and console output.
	getReadableEnginesList() {
		return this.engineNames.join(", ");
	}

	// We pass in templateEngineOverride here because it isn’t yet applied to templateRender
	getEnginesList(engineOverride) {

		// templateEngineOverride in play
		return this.extensionMap.getKey(this.engineNameOrPath);
	}

	async _testRender(str, data) {
		for (const engine of this.#engines) {
			str = engine._testRender(str,data);
		}
		return str;
	}

	/**
	 *
	 * All template languages precompile, if possible, concurrently.
	 * This is because a template may be used a large number of times, like layouts or pagination.
	 *
	 * Then, each template engine is called in sequence to render the template.
	 *
	 * If it is required that the output of one engine be passed to the next, then a custom template engine should
	 * be used instead of the key: ["njk", "md"] surface we give.
	 *
	 * @param {string} str
	 */
	async getCompiledTemplate(str) {
		const compiledFunctions = await Promise.all(
			this.engines.map(async (engine) => {
				return await engine.compile(str);
			})
		);

		return async function recursiveRender(data) {
			let result = str;
			for (const compileFn of compiledFunctions) {
				result = await compileFn(data);
			}
			return result;
		};
	}
}

export default TemplateRender;
