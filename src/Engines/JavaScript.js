import { TemplatePath, isPlainObject } from "@11ty/eleventy-utils";

import TemplateEngine from "./TemplateEngine.js";
import EleventyBaseError from "../Errors/EleventyBaseError.js";
import getJavaScriptData from "../Util/GetJavaScriptData.js";
import { EleventyImport } from "../Util/Require.js";
import { augmentFunction, augmentObject } from "./Util/ContextAugmenter.js";

class JavaScriptTemplateNotDefined extends EleventyBaseError {}

export default class JavaScript extends TemplateEngine {
	constructor(name, templateConfig) {
		super(name, templateConfig);
		this.instances = {};

		this.cacheable = false;

		this.config.events.on("eleventy#templateModified", (inputPath, metadata = {}) => {
			let { usedByDependants, relevantLayouts } = metadata;
			// Remove from cached instances when modified
			let instancesToDelete = [
				inputPath,
				...(usedByDependants || []),
				...(relevantLayouts || []),
			].map((entry) => TemplatePath.addLeadingDotSlash(entry));
			for (let inputPath of instancesToDelete) {
				if (inputPath in this.instances) {
					delete this.instances[inputPath];
				}
			}
		});
	}

	normalize(result) {
		if (Buffer.isBuffer(result)) {
			return result.toString();
		}

		return result;
	}

	// String, Buffer, Promise
	// Function, Class
	// Object
	// Module
	_getInstance(mod) {
		let noop = function () {
			return "";
		};

		let originalModData = mod?.data;

		if (typeof mod === "object" && mod.default && this.eleventyConfig.getIsProjectUsingEsm()) {
			mod = mod.default;
		}

		if (typeof mod === "string" || mod instanceof Buffer || mod.then) {
			return { render: () => mod };
		} else if (typeof mod === "function") {
			if (mod.prototype?.data || mod.prototype?.render) {
				if (!("render" in mod.prototype)) {
					mod.prototype.render = noop;
				}

				if (!("data" in mod.prototype) && !mod.data && originalModData) {
					mod.prototype.data = originalModData;
				}

				return new mod();
			} else {
				return {
					...(originalModData ? { data: originalModData } : undefined),
					render: mod,
				};
			}
		} else if ("data" in mod || "render" in mod) {
			if (!mod.render) {
				mod.render = noop;
			}
			if (!mod.data && originalModData) {
				mod.data = originalModData;
			}
			return mod;
		}
	}

	async #getInstanceFromInputPath(inputPath) {
		let mod;
		let relativeInputPath =
			this.eleventyConfig.directories.getInputPathRelativeToInputDirectory(inputPath);
		if (this.eleventyConfig.userConfig.isVirtualTemplate(relativeInputPath)) {
			mod = this.eleventyConfig.userConfig.virtualTemplates[relativeInputPath].content;
		} else {
			let isEsm = this.eleventyConfig.getIsProjectUsingEsm();
			let cacheBust = !this.cacheable || !this.config.useTemplateCache;
			mod = await EleventyImport(inputPath, isEsm ? "esm" : "cjs", {
				cacheBust,
			});
		}

		let inst = this._getInstance(mod);
		if (inst) {
			this.instances[inputPath] = inst;
		} else {
			throw new JavaScriptTemplateNotDefined(
				`No JavaScript template returned from ${inputPath}. Did you assign module.exports (CommonJS) or export (ESM)?`,
			);
		}
		return inst;
	}

	async getInstanceFromInputPath(inputPath) {
		if (!this.instances[inputPath]) {
			this.instances[inputPath] = this.#getInstanceFromInputPath(inputPath);
		}

		return this.instances[inputPath];
	}

	/**
	 * JavaScript files defer to the module loader rather than read the files to strings
	 *
	 * @override
	 */
	needsToReadFileContents() {
		return false;
	}

	/**
	 * Use the module loader directly
	 *
	 * @override
	 */
	useJavaScriptImport() {
		return true;
	}

	async getExtraDataFromFile(inputPath) {
		let inst = await this.getInstanceFromInputPath(inputPath);
		return getJavaScriptData(inst, inputPath);
	}

	getJavaScriptFunctions(inst) {
		let fns = {};
		let configFns = this.config.javascriptFunctions;

		for (let key in configFns) {
			// prefer pre-existing `page` javascriptFunction, if one exists
			fns[key] = augmentFunction(configFns[key], {
				source: inst,
				overwrite: false,
			});
		}
		return fns;
	}

	// Backwards compat
	static wrapJavaScriptFunction(inst, fn) {
		return augmentFunction(fn, {
			source: inst,
		});
	}

	addExportsToBundles(inst, url) {
		let cfg = this.eleventyConfig.userConfig;
		if (!("getBundleManagers" in cfg)) {
			return;
		}

		let managers = cfg.getBundleManagers();
		for (let name in managers) {
			let mgr = managers[name];
			let key = mgr.getBundleExportKey();
			if (!key) {
				continue;
			}

			if (typeof inst[key] === "string") {
				// export const css = ``;
				mgr.addToPage(url, inst[key]);
			} else if (isPlainObject(inst[key])) {
				if (typeof inst[key][name] === "string") {
					// Object with bundle names:
					// export const bundle = {
					//   css: ``
					// };
					mgr.addToPage(url, inst[key][name]);
				} else if (isPlainObject(inst[key][name])) {
					// Object with bucket names:
					// export const bundle = {
					//   css: {
					//     default: ``
					//   }
					// };
					for (let bucketName in inst[key][name]) {
						mgr.addToPage(url, inst[key][name][bucketName], bucketName);
					}
				}
			}
		}
	}

	async compile(str, inputPath) {
		let inst;
		if (str) {
			// When str has a value, it's being used for permalinks in data
			inst = this._getInstance(str);
		} else {
			// For normal templates, str will be falsy.
			inst = await this.getInstanceFromInputPath(inputPath);
		}

		if (inst?.render) {
			return (data = {}) => {
				// TODO does this do anything meaningful for non-classes?
				// `inst` should have a normalized `render` function from _getInstance

				// Map exports to bundles
				if (data.page?.url) {
					this.addExportsToBundles(inst, data.page.url);
				}

				augmentObject(inst, {
					source: data,
					overwrite: false,
				});

				Object.assign(inst, this.getJavaScriptFunctions(inst));

				return this.normalize(inst.render.call(inst, data));
			};
		}
	}

	static shouldSpiderJavaScriptDependencies() {
		return true;
	}
}
