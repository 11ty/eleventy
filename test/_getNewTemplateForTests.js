const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const TemplateConfig = require("../src/TemplateConfig");
const Template = require("../src/Template");

module.exports = function getNewTemplate(
  path,
  inputDir,
  outputDir,
  templateData = null,
  map = null,
  eleventyConfig = new TemplateConfig()
) {
  if (!map) {
    map = new EleventyExtensionMap(
      [
        "liquid",
        "ejs",
        "md",
        "hbs",
        "mustache",
        "haml",
        "pug",
        "njk",
        "html",
        "11ty.js",
      ],
      eleventyConfig
    );
  }
  return new Template(
    path,
    inputDir,
    outputDir,
    templateData,
    map,
    eleventyConfig
  );
};
