import lodash from "@11ty/lodash-custom";

import EleventyBaseError from "../Errors/EleventyBaseError.js";

const { set: lodashSet } = lodash;

class TemplateDataConfigError extends EleventyBaseError {}

class TemplateDataInitialGlobalData {
	constructor(templateConfig) {
		if (!templateConfig || templateConfig.constructor.name !== "TemplateConfig") {
			throw new TemplateDataConfigError("Missing or invalid `templateConfig` (via Render plugin).");
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

				// This section is problematic when used with eleventyComputed #3389
				if (typeof returnValue === "function") {
					returnValue = await returnValue();
				}

				lodashSet(globalData, key, returnValue);
			}
		}

		return globalData;
	}
}

export default TemplateDataInitialGlobalData;
