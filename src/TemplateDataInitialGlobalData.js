import semver from "semver";
import lodash from "@11ty/lodash-custom";

import EleventyBaseError from "./EleventyBaseError.js";
import { getEleventyPackageJson } from "./Util/ImportJsonSync.js";

const { set: lodashSet } = lodash;
const pkg = getEleventyPackageJson();

class TemplateDataConfigError extends EleventyBaseError {}

class TemplateDataInitialGlobalData {
	constructor(templateConfig) {
		if (!templateConfig) {
			throw new TemplateDataConfigError("Missing `config`.");
		}
		this.templateConfig = templateConfig;
		this.config = this.templateConfig.getConfig();
	}

	async getData() {
		let globalData = {};

		// via eleventyConfig.addGlobalData
		if (this.config.globalData) {
			let keys = Object.keys(this.config.globalData);
			for (let key of keys) {
				let returnValue = this.config.globalData[key];

				if (typeof returnValue === "function") {
					returnValue = await returnValue();
				}

				lodashSet(globalData, key, returnValue);
			}
		}

		if (!("eleventy" in globalData)) {
			globalData.eleventy = {};
		}
		// #2293 for meta[name=generator]
		globalData.eleventy.version = semver.coerce(pkg.version).toString();
		globalData.eleventy.generator = `Eleventy v${globalData.eleventy.version}`;

		return globalData;
	}
}

export default TemplateDataInitialGlobalData;
