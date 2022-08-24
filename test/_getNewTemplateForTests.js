import EleventyExtensionMap from "../src/EleventyExtensionMap.js";
import TemplateConfig from "../src/TemplateConfig.js";
import Template from "../src/Template.js";

export default async function getNewTemplate(
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
  return Template.from(
    path,
    inputDir,
    outputDir,
    templateData,
    map,
    eleventyConfig
  );
}
