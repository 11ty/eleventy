const fs = require("fs-extra");
const chalk = require("chalk");
const lodashMerge = require("lodash/merge");
const TemplatePath = require("./TemplatePath");
const EleventyBaseError = require("./EleventyBaseError");
const eleventyConfig = require("./EleventyConfig");
const debug = require("debug")("Eleventy:TemplateConfig");
const deleteRequireCache = require("./Util/DeleteRequireCache");

class EleventyConfigError extends EleventyBaseError {}

class TemplateConfig {
  constructor(customRootConfig, localProjectConfigPath) {
    this.overrides = {};
    this.localProjectConfigPath = localProjectConfigPath || ".eleventy.js";

    if (customRootConfig) {
      this.customRootConfig = customRootConfig;
      debug("Warning: Using custom root config!");
    } else {
      this.customRootConfig = null;
    }
    this.initializeRootConfig();
    this.config = this.mergeConfig(this.localProjectConfigPath);
  }

  getLocalProjectConfigFile() {
    return TemplatePath.addLeadingDotSlash(this.localProjectConfigPath);
  }

  reset() {
    eleventyConfig.reset();
    this.initializeRootConfig();
    this.config = this.mergeConfig(this.localProjectConfigPath);
  }

  resetOnWatch() {
    // nothing yet
  }

  getConfig() {
    return this.config;
  }

  setProjectConfigPath(path) {
    this.localProjectConfigPath = path;

    this.config = this.mergeConfig(path);
  }

  setPathPrefix(pathPrefix) {
    debug("Setting pathPrefix to %o", pathPrefix);
    this.overrides.pathPrefix = pathPrefix;
    this.config.pathPrefix = pathPrefix;
  }

  initializeRootConfig() {
    this.rootConfig = this.customRootConfig || require("../config.js");

    if (typeof this.rootConfig === "function") {
      this.rootConfig = this.rootConfig(eleventyConfig);
      // debug( "rootConfig is a function, after calling, eleventyConfig is %o", eleventyConfig );
    }
    debug("rootConfig %o", this.rootConfig);
  }

  mergeConfig(localProjectConfigPath) {
    let overrides = ["templateFormats"];
    let localConfig = {};
    let path = TemplatePath.join(
      TemplatePath.getWorkingDir(),
      localProjectConfigPath
    );
    debug(`Merging config with ${path}`);

    if (fs.existsSync(path)) {
      try {
        // remove from require cache so it will grab a fresh copy
        if (path in require.cache) {
          deleteRequireCache(path);
        }

        localConfig = require(path);
        // debug( "localConfig require return value: %o", localConfig );

        if (typeof localConfig === "function") {
          localConfig = localConfig(eleventyConfig);
          // debug( "localConfig is a function, after calling, eleventyConfig is %o", eleventyConfig );

          if (
            typeof localConfig === "object" &&
            typeof localConfig.then === "function"
          ) {
            throw new EleventyConfigError(
              `Error in your Eleventy config file '${path}': Returning a promise is not supported`
            );
          }
        }
      } catch (err) {
        throw new EleventyConfigError(
          `Error in your Eleventy config file '${path}'.` +
            (err.message.includes("Cannot find module")
              ? chalk.blueBright(" You may need to run `npm install`.")
              : ""),
          err
        );
      }
    } else {
      debug("Eleventy local project config file not found, skipping.");
    }

    let eleventyConfigApiMergingObject = eleventyConfig.getMergingConfigObject();
    localConfig = lodashMerge(localConfig, eleventyConfigApiMergingObject);

    // blow away any templateFormats set in config return object and prefer those set in config API.
    for (let localConfigKey of overrides) {
      localConfig[localConfigKey] =
        eleventyConfigApiMergingObject[localConfigKey] ||
        localConfig[localConfigKey];
    }

    // debug("eleventyConfig.getMergingConfigObject: %o", eleventyConfig.getMergingConfigObject());
    debug("localConfig: %o", localConfig);
    debug("overrides: %o", this.overrides);

    // Object assign overrides original values (good only for templateFormats) but not good for anything else
    let merged = lodashMerge({}, this.rootConfig, localConfig, this.overrides);

    // blow away any templateFormats upstream (don’t merge)
    for (let key of overrides) {
      merged[key] = localConfig[key] || this.rootConfig[key];
    }

    debug("Current configuration: %o", merged);

    return merged;
  }
}

module.exports = TemplateConfig;
