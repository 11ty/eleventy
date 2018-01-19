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
    if (rootConfig) {
      debug("Warning: Using custom root config!");
    }

    if (typeof this.rootConfig === "function") {
      this.rootConfig = this.rootConfig(eleventyConfig);
    }

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
    localConfig = lodashMerge(
      localConfig,
      eleventyConfig.getMergingConfigObject()
    );
    debug("localConfig: %O", localConfig);

    // Object assign overrides original values (good only for templateFormats) but not good for anything else
    let merged = lodashMerge({}, this.rootConfig, localConfig);

    // blow away any templateFormats upstream (don’t merge)
    let overrides = ["templateFormats"];
    for (let key of overrides) {
      merged[key] = localConfig[key] || this.rootConfig[key];
    }

    debug("Current configuration: %o", merged);

    return merged;
  }
}

module.exports = TemplateConfig;
