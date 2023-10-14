import EleventyExtensionMap from "../src/EleventyExtensionMap.js";
import TemplateConfig from "../src/TemplateConfig.js";
import Template from "../src/Template.js";
import FileSystemSearch from "../src/FileSystemSearch.js";

export default async function getNewTemplate(
  path,
  inputDir,
  outputDir,
  templateData = null,
  map = null,
  eleventyConfig = new TemplateConfig()
) {
  await eleventyConfig.init();

  if (!map) {
    map = new EleventyExtensionMap(["liquid", "md", "njk", "html", "11ty.js"], eleventyConfig);
  }
  if (templateData) {
    templateData.setFileSystemSearch(new FileSystemSearch());
  }
  return new Template(path, inputDir, outputDir, templateData, map, eleventyConfig);
}
