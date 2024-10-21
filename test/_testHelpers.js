import { isPlainObject } from "@11ty/eleventy-utils";
import TemplateConfig from "../src/TemplateConfig.js";
import ProjectDirectories from "../src/Util/ProjectDirectories.js";

async function getTemplateConfigInstance(configObj, dirs, configObjOverride = undefined) {
	let eleventyConfig;
	if(configObj instanceof TemplateConfig) {
		eleventyConfig = configObj;
		configObj = undefined;

		if(!(dirs instanceof ProjectDirectories)) {
			throw new Error("Testing error: second argument to getTemplateConfigInstance must be a ProjectDirectories instance when the first argument is a TemplateConfig instance.")
		}
	} else {
		eleventyConfig = new TemplateConfig();
	}

	eleventyConfig.setProjectUsingEsm(true);

	if(!(dirs instanceof ProjectDirectories)) {
		dirs = new ProjectDirectories();
		if(isPlainObject(configObj) && !configObj.dir) {
			throw new Error("Testing error: missing `dir` property on config object literal passed in.")
		}
		dirs.setViaConfigObject(configObj?.dir || {});
	}

	eleventyConfig.setDirectories(dirs);

	await eleventyConfig.init(configObjOverride || configObj); // overrides

	return eleventyConfig;
}

async function getTemplateConfigInstanceCustomCallback(dirObject, configCallback) {
	let tmplCfg = new TemplateConfig();

	configCallback(tmplCfg.userConfig);

	let dirs = new ProjectDirectories();
	dirs.setViaConfigObject(dirObject);

	let eleventyConfig = await getTemplateConfigInstance(tmplCfg, dirs, {
		dir: dirObject
	});
	return eleventyConfig;
}

export {
	getTemplateConfigInstance,
	getTemplateConfigInstanceCustomCallback,
};
