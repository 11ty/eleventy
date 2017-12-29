const fs = require("fs-extra");
const merge = require("lodash.merge");
const TemplatePath = require("./TemplatePath");

function TemplateConfig(globalConfig, localConfigPath) {
  this.localConfigPath = localConfigPath || ".eleventy.js";
  this.config = this.mergeConfig(globalConfig);
}

TemplateConfig.getDefaultConfig = function() {
  let templateCfg = new TemplateConfig(require("../config.js"));
  return templateCfg.getConfig();
};

TemplateConfig.prototype.getConfig = function() {
  return this.config;
};

TemplateConfig.prototype.mergeConfig = function(globalConfig) {
  let localConfig;
  let path = TemplatePath.normalize(
    TemplatePath.getWorkingDir() + "/" + this.localConfigPath
  );
  try {
    localConfig = require(path);
  } catch (e) {
    // if file does not exist, return empty obj
    localConfig = {};
  }

  // Object assign overrides original values (good only for templateFormats) but not good for everything else
  let merged = merge({}, globalConfig, localConfig);

  let overrides = ["templateFormats"];
  for (let key of overrides) {
    merged[key] = localConfig[key] || globalConfig[key];
  }

  return merged;
};

module.exports = TemplateConfig;
