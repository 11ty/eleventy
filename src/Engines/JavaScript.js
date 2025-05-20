import { isPlainObject } from "@11ty/eleventy-utils";

import EleventyBaseError from "../Errors/EleventyBaseError.js";
import getJavaScriptData from "../Util/GetJavaScriptData.js";
import { EleventyImport } from "../Util/Require.js";
import TemplateEngine from "./TemplateEngine.js";
import { augmentFunction, augmentObject } from "./Util/ContextAugmenter.js";

class JavaScriptTemplateNotDefined extends EleventyBaseError {}

export default class JavaScript extends TemplateEngine {
	constructor(name, templateConfig) {
		super(name, templateConfig);
		this.cacheable = false;
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
		if (!inst) {
			throw new JavaScriptTemplateNotDefined(
				`No JavaScript template returned from ${inputPath}. Did you assign module.exports (CommonJS) or export (ESM)?`,
			);
		}
		return inst;
	}

	async getInstanceFromInputPath(inputPath) {
		return this.#getInstanceFromInputPath(inputPath);
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
		return async (data = {}) => {
			// TODO does this do anything meaningful for non-classes?
			// `inst` should have a normalized `render` function from _getInstance

			const inst = await this.getInstanceFromInputPath(inputPath);
			if (!inst?.render) {
				return;
			}

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

	static shouldSpiderJavaScriptDependencies() {
		return true;
	}
}
