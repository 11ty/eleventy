import { TemplatePath } from "@11ty/eleventy-utils";

import TemplateEngineManager from "./Engines/TemplateEngineManager.js";
import EleventyBaseError from "./Errors/EleventyBaseError.js";

class EleventyExtensionMapConfigError extends EleventyBaseError {}

class EleventyExtensionMap {
	constructor(formatKeys, config) {
		this.config = config;

		this.formatKeys = formatKeys;

		this.setFormats(formatKeys);

		this._spiderJsDepsCache = {};
	}

	setFormats(formatKeys = []) {
		this.unfilteredFormatKeys = formatKeys.map((key) => key.trim().toLowerCase());

		this.validTemplateLanguageKeys = this.unfilteredFormatKeys.filter((key) =>
			this.hasExtension(key),
		);

		this.passthroughCopyKeys = this.unfilteredFormatKeys.filter((key) => !this.hasExtension(key));
	}

	set config(cfg) {
		if (!cfg || cfg.constructor.name !== "TemplateConfig") {
			throw new EleventyExtensionMapConfigError(
				"Missing or invalid `config` argument (via setter).",
			);
		}
		this.eleventyConfig = cfg;
	}

	get config() {
		return this.eleventyConfig.getConfig();
	}

	get engineManager() {
		if (!this._engineManager) {
			this._engineManager = new TemplateEngineManager(this.eleventyConfig);
		}

		return this._engineManager;
	}

	reset() {
		this.engineManager.reset();
	}

	/* Used for layout path resolution */
	getFileList(path, dir) {
		if (!path) {
			return [];
		}

		let files = [];
		this.validTemplateLanguageKeys.forEach(
			function (key) {
				this.getExtensionsFromKey(key).forEach(function (extension) {
					files.push((dir ? dir + "/" : "") + path + "." + extension);
				});
			}.bind(this),
		);

		return files;
	}

	// Warning: this would false positive on an include, but is only used
	// on paths found from the file system glob search.
	// TODO: Method name might just need to be renamed to something more accurate.
	isFullTemplateFilePath(path) {
		return this.validTemplateLanguageKeys.some((extension) => path.endsWith(`.${extension}`));
	}

	getCustomExtensionEntry(extension) {
		if (!this.config.extensionMap) {
			return;
		}

		for (let entry of this.config.extensionMap) {
			if (entry.extension === extension) {
				return entry;
			}
		}
	}

	getValidExtensionsForPath(path) {
		let extensions = new Set(
			Array.from(Object.keys(this.extensionToKeyMap)).filter((extension) =>
				path.endsWith(`.${extension}`),
			),
		);

		// if multiple extensions are valid, sort from longest to shortest
		// e.g. .11ty.js and .js
		let sorted = Array.from(extensions)
			.filter((extension) => this.validTemplateLanguageKeys.includes(extension))
			.sort((a, b) => b.length - a.length);

		return sorted;
	}

	async shouldSpiderJavaScriptDependencies(path) {
		let extensions = this.getValidExtensionsForPath(path);
		for (let extension of extensions) {
			if (extension in this._spiderJsDepsCache) {
				return this._spiderJsDepsCache[extension];
			}

			let cls = await this.engineManager.getEngineClassByExtension(extension);
			if (cls) {
				let entry = this.getCustomExtensionEntry(extension);
				let shouldSpider = cls.shouldSpiderJavaScriptDependencies(entry);
				this._spiderJsDepsCache[extension] = shouldSpider;
				return shouldSpider;
			}
		}

		return false;
	}

	getPassthroughCopyGlobs(inputDir) {
		return this._getGlobs(this.passthroughCopyKeys, inputDir);
	}

	getValidGlobs(inputDir) {
		return this._getGlobs(this.validTemplateLanguageKeys, inputDir);
	}

	getGlobs(inputDir) {
		return this._getGlobs(this.unfilteredFormatKeys, inputDir);
	}

	_getGlobs(formatKeys, inputDir) {
		let dir = TemplatePath.convertToRecursiveGlobSync(inputDir);
		let extensions = [];
		for (let key of formatKeys) {
			if (this.hasExtension(key)) {
				for (let extension of this.getExtensionsFromKey(key)) {
					extensions.push(extension);
				}
			} else {
				extensions.push(key);
			}
		}

		let globs = [];
		if (extensions.length === 1) {
			globs.push(`${dir}/*.${extensions[0]}`);
		} else if (extensions.length > 1) {
			globs.push(`${dir}/*.{${extensions.join(",")}}`);
		}

		return globs;
	}

	hasExtension(key) {
		return [...Object.values(this.extensionToKeyMap)].includes(key);
	}

	getExtensionsFromKey(key) {
		let extensions = [];
		for (let [extension, entry] of Object.entries(this.extensionToKeyMap)) {
			if (entry === key) {
				extensions.push(extension);
			}
		}
		return extensions;
	}

	// Only `addExtension` configuration API extensions
	getExtensionEntriesFromKey(key) {
		if (this.config?.extensionMap) {
			let entries = [];
			for (let entry of this.config.extensionMap) {
				if (entry.key === key) {
					entries.push(entry);
					return entries;
				}
			}
		}
		return [];
	}

	hasEngine(pathOrKey) {
		return !!this.getKey(pathOrKey);
	}

	getKey(pathOrKey) {
		pathOrKey = (pathOrKey || "").toLowerCase();

		for (let [extension, key] of Object.entries(this.extensionToKeyMap)) {
			if (pathOrKey === extension || pathOrKey.endsWith(`.${extension}`)) {
				return key;
			}
		}
	}

	removeTemplateExtension(path) {
		for (let extension in this.extensionToKeyMap) {
			if (path === extension || path.endsWith(`.${extension}`)) {
				return path.slice(0, Math.max(0, path.length - 1 - extension.length));
			}
		}
		return path;
	}

	// keys are file extensions
	// values are template language keys
	get extensionToKeyMap() {
		if (!this._extensionToKeyMap) {
			this._extensionToKeyMap = {
				md: "md",
				html: "html",
				njk: "njk",
				liquid: "liquid",
				"11ty.js": "11ty.js",
				"11ty.cjs": "11ty.js",
				"11ty.mjs": "11ty.js",
			};

			if (this.config?.extensionMap) {
				for (let entry of this.config.extensionMap) {
					this._extensionToKeyMap[entry.extension] = entry.key;
				}
			}
		}

		return this._extensionToKeyMap;
	}

	getReadableFileExtensions() {
		return Object.keys(this.extensionToKeyMap).join(" ");
	}
}

export default EleventyExtensionMap;
