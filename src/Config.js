const TemplateConfig = require("./TemplateConfig");
const debug = require("debug")("Eleventy:Config");

debug("Getting all config values.");
let config = TemplateConfig.getDefaultConfig();

module.exports = config;
