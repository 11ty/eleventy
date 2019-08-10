const TemplateConfig = require("./TemplateConfig");
const debug = require("debug")("Eleventy:Config");

debug("Setting up global TemplateConfig.");
let config = new TemplateConfig();

module.exports = config;
