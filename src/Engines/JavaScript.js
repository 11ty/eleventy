import { TemplatePath, isPlainObject } from "@11ty/eleventy-utils";

import TemplateEngine from "./TemplateEngine.js";
import EleventyBaseError from "../Errors/EleventyBaseError.js";
import getJavaScriptData from "../Util/GetJavaScriptData.js";
import EventBusUtil from "../Util/EventBusUtil.js";
import { EleventyImport } from "../Util/Require.js";

class JavaScriptTemplateNotDefined extends EleventyBaseError {}

class JavaScript extends TemplateEngine {
	// which data keys to bind to `this` in JavaScript template functions
	static DATA_KEYS_TO_BIND = ["page", "eleventy"];

	constructor(name, templateConfig) {
		super(name, templateConfig);
		this.instances = {};

		this.cacheable = false;
		EventBusUtil.soloOn("eleventy.templateModified", (inputPath, usedByDependants = []) => {
			// Remove from cached instances when modified
			let instancesToDelete = [TemplatePath.addLeadingDotSlash(inputPath), ...usedByDependants];
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

		if (typeof mod === "string" || mod instanceof Buffer || mod.then) {
			return { render: () => mod };
		} else if (typeof mod === "function") {
			if (mod.prototype && ("data" in mod.prototype || "render" in mod.prototype)) {
				if (!("render" in mod.prototype)) {
					mod.prototype.render = noop;
				}
				return new mod();
			} else {
				return {
					render: mod,
				};
			}
		} else if (
			"data" in mod ||
			"render" in mod ||
			("default" in mod && this.eleventyConfig.getIsProjectUsingEsm())
		) {
			if (!("render" in mod)) {
				if ("default" in mod) {
					mod.render = mod.default;
				} else {
					mod.render = noop;
				}
			}
			return mod;
		}
	}

	async getInstanceFromInputPath(inputPath) {
		if (this.instances[inputPath]) {
			return this.instances[inputPath];
		}

		let isEsm = this.eleventyConfig.getIsProjectUsingEsm();
		const mod = await EleventyImport(inputPath, isEsm ? "esm" : "cjs");

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

	/**
	 * JavaScript files defer to the module loader rather than read the files to strings
	 *
	 * @override
	 */
	needsToReadFileContents() {
		return false;
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
			if (key === "page") {
				// do nothing
			} else {
				// note: wrapping creates a new function
				fns[key] = JavaScript.wrapJavaScriptFunction(inst, configFns[key]);
			}
		}
		return fns;
	}

	static wrapJavaScriptFunction(inst, fn) {
		return function (...args) {
			for (let key of JavaScript.DATA_KEYS_TO_BIND) {
				if (inst && inst[key]) {
					this[key] = inst[key];
				}
			}

			return fn.call(this, ...args);
		};
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

		if (inst && "render" in inst) {
			return function (data = {}) {
				// TODO does this do anything meaningful for non-classes?
				// `inst` should have a normalized `render` function from _getInstance

				// Map exports to bundles
				if (data.page?.url) {
					this.addExportsToBundles(inst, data.page.url);
				}

				for (let key of JavaScript.DATA_KEYS_TO_BIND) {
					if (!inst[key] && data[key]) {
						// only blow away existing inst.page if it has a page.url
						if (key !== "page" || !inst.page || inst.page.url) {
							inst[key] = data[key];
						}
					}
				}

				Object.assign(inst, this.getJavaScriptFunctions(inst));

				return this.normalize(inst.render.call(inst, data));
			}.bind(this);
		}
	}

	static shouldSpiderJavaScriptDependencies() {
		return true;
	}
}

export default JavaScript;
