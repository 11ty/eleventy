const chalk = require("chalk");
const TemplateConfig = require("./TemplateConfig");
const EleventyErrorHandler = require("./EleventyErrorHandler");
const debug = require("debug")("Eleventy:Config");

debug("Setting up global TemplateConfig.");
let config;
try {
  config = new TemplateConfig();
} catch (e) {
  console.log("\n" + chalk.red("Problem with Eleventy configuration: "));

  EleventyErrorHandler.log(e);
}

module.exports = config;
