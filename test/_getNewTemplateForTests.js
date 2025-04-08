import EleventyExtensionMap from "../src/EleventyExtensionMap.js";
import Template from "../src/Template.js";
import FileSystemSearch from "../src/FileSystemSearch.js";
import TemplateEngineManager from "../src/Engines/TemplateEngineManager.js";

import { getTemplateConfigInstance } from "./_testHelpers.js";

export default async function getNewTemplate(
  path,
  inputDir,
  outputDir,
  templateData = null,
  map = null,
  eleventyConfig = null
) {
  if (!eleventyConfig) {
    eleventyConfig = await getTemplateConfigInstance({
      dir: {
        input: inputDir,
        output: outputDir,
      }
    });
  }

  let engineManager = new TemplateEngineManager(eleventyConfig);
  if (!map) {
    map = new EleventyExtensionMap(eleventyConfig);
    map.setFormats(["liquid", "md", "njk", "html", "11ty.js"]);
    map.engineManager = engineManager;
  }
  if (templateData) {
    templateData.setFileSystemSearch(new FileSystemSearch());
    templateData.extensionMap = map;
  }
  let tmpl = new Template(path, templateData, map, eleventyConfig);

  await tmpl.getTemplateRender();

  return tmpl;
}
