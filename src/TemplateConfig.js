const fs = require("fs-extra");
const merge = require("lodash.merge");
const TemplatePath = require("./TemplatePath");

function TemplateConfig(globalConfig, localConfigPath) {
  this.localConfigPath = localConfigPath || ".eleventy.js";
  this.config = this.mergeConfig(globalConfig);
}

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
  return merge({}, globalConfig, localConfig);
};

module.exports = TemplateConfig;
