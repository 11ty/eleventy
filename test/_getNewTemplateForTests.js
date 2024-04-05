import EleventyExtensionMap from "../src/EleventyExtensionMap.js";
import Template from "../src/Template.js";
import FileSystemSearch from "../src/FileSystemSearch.js";

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

  if (!map) {
    map = new EleventyExtensionMap(["liquid", "md", "njk", "html", "11ty.js"], eleventyConfig);
  }
  if (templateData) {
    templateData.setFileSystemSearch(new FileSystemSearch());
  }
  let tmpl = new Template(path, inputDir, outputDir, templateData, map, eleventyConfig);

  await tmpl.getTemplateRender();

  return tmpl;
}
