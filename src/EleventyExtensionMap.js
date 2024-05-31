import { TemplatePath } from "@11ty/eleventy-utils";

import TemplateEngineManager from "./Engines/TemplateEngineManager.js";
import EleventyBaseError from "./Errors/EleventyBaseError.js";

class EleventyExtensionMapConfigError extends EleventyBaseError {}

class EleventyExtensionMap {
	constructor(config) {
		this.config = config;

		this._spiderJsDepsCache = {};
	}

	setFormats(formatKeys = []) {
		// raw
		this.formatKeys = formatKeys;

		this.unfilteredFormatKeys = formatKeys.map(function (key) {
			return key.trim().toLowerCase();
		});

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
		for (let extension of this.validTemplateLanguageKeys) {
			if (path.endsWith(`.${extension}`)) {
				return true;
			}
		}
		return false;
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
		let extensions = new Set();
		for (let extension in this.extensionToKeyMap) {
			if (path.endsWith(`.${extension}`)) {
				extensions.add(extension);
			}
		}

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
		let extensions = new Set();

		for (let key of formatKeys) {
			if (this.hasExtension(key)) {
				for (let extension of this.getExtensionsFromKey(key)) {
					extensions.add(extension);
				}
			} else {
				extensions.add(key);
			}
		}

		if (extensions.size === 1) {
			return [`${dir}/*.${Array.from(extensions)[0]}`];
		} else if (extensions.size > 1) {
			return [
				// extra curly brackets /*.{cjs,txt}
				`${dir}/*.{${Array.from(extensions).join(",")}}`,
			];
		}

		return [];
	}

	hasExtension(key) {
		for (let extension in this.extensionToKeyMap) {
			if (
				this.extensionToKeyMap[extension].key === key ||
				this.extensionToKeyMap[extension].aliasKey === key
			) {
				return true;
			}
		}

		return false;
	}

	getExtensionsFromKey(key) {
		let extensions = new Set();
		for (let extension in this.extensionToKeyMap) {
			if (this.extensionToKeyMap[extension].aliasKey) {
				// only add aliased extension if explicitly referenced in formats
				// overrides will not have an aliasKey (md => md)
				if (this.extensionToKeyMap[extension].aliasKey === key) {
					extensions.add(extension);
				}
			} else if (this.extensionToKeyMap[extension].key === key) {
				extensions.add(extension);
			}
		}

		return Array.from(extensions);
	}

	// Only `addExtension` configuration API extensions
	getExtensionEntriesFromKey(key) {
		let entries = new Set();
		if ("extensionMap" in this.config) {
			for (let entry of this.config.extensionMap) {
				if (entry.key === key) {
					entries.add(entry);
				}
			}
		}
		return Array.from(entries);
	}

	// Determines whether a path is a passthrough copy file or a template (via TemplateWriter)
	hasEngine(pathOrKey) {
		return !!this.getKey(pathOrKey);
	}

	getKey(pathOrKey) {
		pathOrKey = (pathOrKey || "").toLowerCase();
		for (let extension in this.extensionToKeyMap) {
			if (pathOrKey === extension || pathOrKey.endsWith("." + extension)) {
				let key =
					this.extensionToKeyMap[extension].aliasKey || this.extensionToKeyMap[extension].key;
				// must be a valid format key passed (e.g. via --formats)
				if (this.validTemplateLanguageKeys.includes(key)) {
					return key;
				}
			}
		}
	}

	getExtensionEntry(pathOrKey) {
		pathOrKey = (pathOrKey || "").toLowerCase();
		for (let extension in this.extensionToKeyMap) {
			if (pathOrKey === extension || pathOrKey.endsWith("." + extension)) {
				return this.extensionToKeyMap[extension];
			}
		}
	}

	removeTemplateExtension(path) {
		for (let extension in this.extensionToKeyMap) {
			if (path === extension || path.endsWith("." + extension)) {
				return path.slice(
					0,
					path.length - 1 - extension.length < 0 ? 0 : path.length - 1 - extension.length,
				);
			}
		}
		return path;
	}

	// keys are file extensions
	// values are template language keys
	get extensionToKeyMap() {
		if (!this._extensionToKeyMap) {
			this._extensionToKeyMap = {
				md: { key: "md", extension: "md" },
				html: { key: "html", extension: "html" },
				njk: { key: "njk", extension: "njk" },
				liquid: { key: "liquid", extension: "liquid" },
				"11ty.js": { key: "11ty.js", extension: "11ty.js" },
				"11ty.cjs": { key: "11ty.js", extension: "11ty.cjs" },
				"11ty.mjs": { key: "11ty.js", extension: "11ty.mjs" },
			};

			if ("extensionMap" in this.config) {
				for (let entry of this.config.extensionMap) {
					// extension and key are only different when aliasing.
					this._extensionToKeyMap[entry.extension] = entry;
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
