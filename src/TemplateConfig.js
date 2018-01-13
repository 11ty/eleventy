const fs = require("fs-extra");
const lodashMerge = require("lodash.merge");
const TemplatePath = require("./TemplatePath");
const mainRootConfig = require("../config.js");
const eleventyConfig = require("./EleventyConfig");
const debug = require("debug")("Eleventy:TemplateConfig");

class TemplateConfig {
  constructor(rootConfig, projectConfigPath) {
    this.projectConfigPath = projectConfigPath || ".eleventy.js";
    this.rootConfig = rootConfig || mainRootConfig;

    this.config = this.mergeConfig(this.projectConfigPath);
  }

  getConfig() {
    return this.config;
  }

  setProjectConfigPath(path) {
    this.projectConfigPath = path;

    this.config = this.mergeConfig(path);
  }

  mergeConfig(projectConfigPath) {
    debug(`Merging config with ${projectConfigPath}`);
    let localConfig;
    let path = TemplatePath.normalize(
      TemplatePath.getWorkingDir() + "/" + projectConfigPath
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

    // Object assign overrides original values (good only for templateFormats) but not good for anything else
    let merged = lodashMerge({}, this.rootConfig, localConfig);

    let overrides = ["templateFormats"];
    for (let key of overrides) {
      merged[key] = localConfig[key] || this.rootConfig[key];
    }

    for (let key in merged) {
      let str = merged[key];
      if (typeof merged[key] === "object") {
        str = JSON.stringify(merged[key]);
      }
      debug(`Config ${key} = ${str}`);
    }

    return merged;
  }
}

module.exports = TemplateConfig;
