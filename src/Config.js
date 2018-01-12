const TemplateConfig = require("./TemplateConfig");
const debug = require("debug")("Eleventy:Config");

debug("Setting up global TemplateConfig.");
module.exports = new TemplateConfig();
