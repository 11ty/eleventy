const chalk = require("chalk");
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
      // debug( "rootConfig is a function, after calling, eleventyConfig is %o", eleventyConfig );
    }
    debug("rootConfig %o", this.rootConfig);

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
    let localConfig = {};
    let path = TemplatePath.normalize(
      TemplatePath.getWorkingDir() + "/" + projectConfigPath
    );
    debug(`Merging config with ${path}`);

    if (fs.existsSync(path)) {
      try {
        localConfig = require(path);
        // debug( "localConfig require return value: %o", localConfig );
      } catch (err) {
        // TODO if file does exist, rethrow the error or console.log the error (file has syntax problem)

        // if file does not exist, return empty obj
        localConfig = {};
        debug(chalk.red("Problem getting localConfig file, %o"), err);
      }
    } else {
      debug("Eleventy local project config file not found, skipping.");
    }

    if (typeof localConfig === "function") {
      localConfig = localConfig(eleventyConfig);
      // debug( "localConfig is a function, after calling, eleventyConfig is %o", eleventyConfig );
    }
    localConfig = lodashMerge(
      localConfig,
      eleventyConfig.getMergingConfigObject()
    );
    // debug("eleventyConfig.getMergingConfigObject: %o", eleventyConfig.getMergingConfigObject());
    debug("localConfig: %o", localConfig);

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
