import { isPlainObject } from "@11ty/eleventy-utils";
import TemplateConfig from "../src/TemplateConfig.js";
import ProjectDirectories from "../src/Util/ProjectDirectories.js";
import EleventyExtensionMap from "../src/EleventyExtensionMap.js";
import TemplatePassthroughManager from "../src/TemplatePassthroughManager.js";
import EleventyFiles from "../src/EleventyFiles.js";
import FileSystemSearch from "../src/FileSystemSearch.js";
import TemplateWriter from "../src/TemplateWriter.js";
import TemplateEngineManager from "../src/Engines/TemplateEngineManager.js";

export async function getTemplateConfigInstance(configObj, dirs, configObjOverride = undefined) {
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

export async function getTemplateConfigInstanceCustomCallback(dirObject, configCallback) {
	let tmplCfg = new TemplateConfig();

	configCallback(tmplCfg.userConfig);

	let dirs = new ProjectDirectories();
	dirs.setViaConfigObject(dirObject);

	let eleventyConfig = await getTemplateConfigInstance(tmplCfg, dirs, {
		dir: dirObject
	});
	return eleventyConfig;
}

export function getTemplateWriterInstance(formats, templateConfig) {
  let { eleventyFiles, passthroughManager } = getEleventyFilesInstance(formats, templateConfig);
  let templateWriter = new TemplateWriter(
    formats,
    null,
    templateConfig,
  );

  let engineManager = new TemplateEngineManager(templateConfig);
  let map = new EleventyExtensionMap(templateConfig);
  map.engineManager = engineManager;
  map.setFormats(formats);

  templateWriter.extensionMap = map;

  templateWriter.setEleventyFiles(eleventyFiles);
  templateWriter.setPassthroughManager(passthroughManager);

  return {
    templateWriter,
    eleventyFiles,
    passthroughManager,
  }
}

export function getEleventyFilesInstance(formats, templateConfig) {
	let map = new EleventyExtensionMap(templateConfig);
	map.setFormats(formats);

  let fss = new FileSystemSearch();
	let mgr = new TemplatePassthroughManager(templateConfig);

	mgr.extensionMap = map;
	mgr.setFileSystemSearch(fss);

	let files = new EleventyFiles(formats, templateConfig);
	files.setPassthroughManager(mgr);
	files.setFileSystemSearch(fss);
	files.extensionMap = map;
	// files.templateData = this.templateData;
	files.init();

  return {
    eleventyFiles: files,
    passthroughManager: mgr,
  };
}

export function sortEleventyResults(a, b) {
  if(b.inputPath > a.inputPath) {
    return 1;
  } else if(b.inputPath < a.inputPath) {
    return -1;
  }
  return 0;
}
