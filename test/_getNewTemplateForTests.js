const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const TemplateConfig = require("../src/TemplateConfig");
const Template = require("../src/Template");
const FileSystemSearch = require("../src/FileSystemSearch");

module.exports = function getNewTemplate(
  path,
  inputDir,
  outputDir,
  templateData = null,
  map = null,
  eleventyConfig = new TemplateConfig()
) {
  if (!map) {
    map = new EleventyExtensionMap(["liquid", "md", "njk", "html", "11ty.js"], eleventyConfig);
  }
  if (templateData) {
    templateData.setFileSystemSearch(new FileSystemSearch());
  }
  return new Template(path, inputDir, outputDir, templateData, map, eleventyConfig);
};
