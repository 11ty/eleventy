const fs = require("fs-extra");
const lodashMerge = require("lodash.merge");
const TemplatePath = require("./TemplatePath");
const eleventyConfig = require("./EleventyConfig");

function TemplateConfig(rootConfig, projectConfigPath) {
  this.projectConfigPath = projectConfigPath || ".eleventy.js";
  this.rootConfig = rootConfig;
  this.config = this.mergeConfig();
}

/* Static function to get active config */
TemplateConfig.getDefaultConfig = function() {
  let cachedTemplateConfig = new TemplateConfig(require("../config.js"));
  return cachedTemplateConfig.getConfig();
};

TemplateConfig.prototype.getConfig = function() {
  return this.config;
};

TemplateConfig.prototype.mergeConfig = function() {
  let localConfig;
  let path = TemplatePath.normalize(
    TemplatePath.getWorkingDir() + "/" + this.projectConfigPath
  );

  try {
    localConfig = require(path);
  } catch (e) {
    // if file does not exist, return empty obj
    localConfig = {};
  }

  if (typeof localConfig === "function") {
    localConfig = localConfig(eleventyConfig);
  }

  // Object assign overrides original values (good only for templateFormats) but not good for everything else
  let merged = lodashMerge({}, this.rootConfig, localConfig);

  let overrides = ["templateFormats"];
  for (let key of overrides) {
    merged[key] = localConfig[key] || this.rootConfig[key];
  }

  return merged;
};

module.exports = TemplateConfig;
