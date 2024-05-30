import debugUtil from "debug";
import EleventyBaseError from "../Errors/EleventyBaseError.js";
import { EleventyImportFromEleventy } from "../Util/Require.js";

const debug = debugUtil("Eleventy:TemplateEngineManager");

class TemplateEngineManagerConfigError extends EleventyBaseError {}

class TemplateEngineManager {
	constructor(eleventyConfig) {
		if (!eleventyConfig || eleventyConfig.constructor.name !== "TemplateConfig") {
			throw new TemplateEngineManagerConfigError("Missing or invalid `config` argument.");
		}
		this.eleventyConfig = eleventyConfig;

		this.engineCache = {};
		this.importCache = {};
	}

	get config() {
		return this.eleventyConfig.getConfig();
	}

	static isAlias(entry) {
		if (entry.aliasKey) {
			return true;
		}

		return entry.key !== entry.extension;
	}

	static isSimpleAlias(entry) {
		if (!this.isAlias(entry)) {
			return false;
		}

		// has keys other than key, extension, and aliasKey
		return (
			Object.keys(entry).some((key) => {
				return key !== "key" && key !== "extension" && key !== "aliasKey";
			}) === false
		);
	}

	get keyToClassNameMap() {
		if (!this._keyToClassNameMap) {
			this._keyToClassNameMap = {
				md: "Markdown",
				html: "Html",
				njk: "Nunjucks",
				liquid: "Liquid",
				"11ty.js": "JavaScript",
			};

			// Custom entries *can* overwrite default entries above
			if ("extensionMap" in this.config) {
				for (let entry of this.config.extensionMap) {
					// either the key does not already exist or it is not a simple alias and is an override: https://www.11ty.dev/docs/languages/custom/#overriding-an-existing-template-language
					let existingTarget = this._keyToClassNameMap[entry.key];
					let isAlias = TemplateEngineManager.isAlias(entry);

					if (!existingTarget && isAlias) {
						throw new Error(
							`An attempt to alias ${entry.aliasKey} to ${entry.key} was made, but ${entry.key} is not a recognized template syntax.`,
						);
					}

					if (isAlias) {
						// only `key` and `extension`, not `compile` or other options
						if (!TemplateEngineManager.isSimpleAlias(entry)) {
							this._keyToClassNameMap[entry.aliasKey] = "Custom";
						} else {
							this._keyToClassNameMap[entry.aliasKey] = this._keyToClassNameMap[entry.key];
						}
					} else {
						// not an alias, so `key` and `extension` are the same here.
						// *can* override a built-in extension!
						this._keyToClassNameMap[entry.key] = "Custom";
					}
				}
			}
		}

		return this._keyToClassNameMap;
	}

	reset() {
		this.engineCache = {};
	}

	getClassNameFromTemplateKey(key) {
		return this.keyToClassNameMap[key];
	}

	hasEngine(name) {
		return !!this.getClassNameFromTemplateKey(name);
	}

	isEngineDeprecated(name) {
		return ["ejs", "hbs", "mustache", "haml", "pug"].includes(name) && !this.hasEngine(name);
	}

	async getEngineClassByExtension(extension) {
		if (this.importCache[extension]) {
			return this.importCache[extension];
		}

		let promise;

		// We include these as raw strings (and not more readable variables) so they’re parsed by a bundler.
		if (extension === "md") {
			promise = EleventyImportFromEleventy("./src/Engines/Markdown.js");
		} else if (extension === "html") {
			promise = EleventyImportFromEleventy("./src/Engines/Html.js");
		} else if (extension === "njk") {
			promise = EleventyImportFromEleventy("./src/Engines/Nunjucks.js");
		} else if (extension === "liquid") {
			promise = EleventyImportFromEleventy("./src/Engines/Liquid.js");
		} else if (extension === "11ty.js") {
			promise = EleventyImportFromEleventy("./src/Engines/JavaScript.js");
		} else {
			promise = this.getCustomEngineClass();
		}

		this.importCache[extension] = promise;

		return promise;
	}

	async getCustomEngineClass() {
		if (!this._CustomEngine) {
			this._CustomEngine = EleventyImportFromEleventy("./src/Engines/Custom.js");
		}
		return this._CustomEngine;
	}

	async getEngine(name, extensionMap) {
		// Warning about engine deprecation
		// TODO v3.0 error message needs updating before stable release
		if (this.isEngineDeprecated(name)) {
			throw new Error(
				`Per the 11ty community survey, the "${name}" template syntax was removed from core in v3.0. You can read more https://github.com/11ty/eleventy/issues/3124 including plans to offer some of these as official plugins (outside of core). You can implement these yourself using https://www.11ty.dev/docs/languages/custom/`,
			);
		}

		if (!this.hasEngine(name)) {
			throw new Error(`Template Engine ${name} does not exist in getEngine()`);
		}

		// TODO these cached engines should be based on extensions not name, then we can remove the error in
		//  "Double override (not aliases) throws an error" test in TemplateRenderCustomTest.js
		if (!this.engineCache[name]) {
			debug("Engine cache miss %o (should only happen once per type)", name);
			// Make sure cache key is based on name and not path
			// Custom class is used for all plugins, cache once per plugin
			this.engineCache[name] = new Promise(async (resolve) => {
				let cls = await this.getEngineClassByExtension(name);
				let instance = new cls(name, this.eleventyConfig);
				instance.extensionMap = extensionMap;
				instance.engineManager = this;

				let extensionEntry = extensionMap.getExtensionEntry(name);
				// Override a built-in extension (md => md)
				// If provided a "Custom" engine using addExtension, but that engine's instance is *not* custom,
				// The user must be overriding a built-in engine i.e. addExtension('md', { ...overrideBehavior })
				let className = this.getClassNameFromTemplateKey(name);

				if (className === "Custom" && instance.constructor.name !== "CustomEngine") {
					let CustomEngine = await this.getCustomEngineClass();
					let overrideCustomEngine = new CustomEngine(name, this.eleventyConfig);

					// Keep track of the "default" engine 11ty would normally use
					// This allows the user to access the default engine in their override
					overrideCustomEngine.setDefaultEngine(instance);

					instance = overrideCustomEngine;
					// Alias to a built-in extension (11ty.tsx => 11ty.js)
				} else if (
					instance.constructor.name === "CustomEngine" &&
					TemplateEngineManager.isAlias(extensionEntry)
				) {
					// add defaultRenderer for complex aliases with their own compile functions.
					let originalEngineInstance = await this.getEngine(extensionEntry.key, extensionMap);
					instance.setDefaultEngine(originalEngineInstance);
				}

				resolve(instance);
			});
		}

		return this.engineCache[name];
	}
}

export default TemplateEngineManager;
