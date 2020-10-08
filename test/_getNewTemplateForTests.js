const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const Template = require("../src/Template");

module.exports = function getNewTemplate(
  path,
  inputDir,
  outputDir,
  templateData = null,
  map = null
) {
  if (!map) {
    map = new EleventyExtensionMap([
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
    ]);
  }
  let tmpl = new Template(path, inputDir, outputDir, templateData, map);
  return tmpl;
};
