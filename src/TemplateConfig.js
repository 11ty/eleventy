const fs = require("fs");
const chalk = require("kleur");
const lodashUniq = require("lodash/uniq");
const lodashMerge = require("lodash/merge");
const { TemplatePath } = require("@11ty/eleventy-utils");
const EleventyBaseError = require("./EleventyBaseError");
const UserConfig = require("./UserConfig");
const debug = require("debug")("Eleventy:TemplateConfig");
const debugDev = require("debug")("Dev:Eleventy:TemplateConfig");
const deleteRequireCache = require("./Util/DeleteRequireCache");
const eventBus = require("./EventBus");

/**
 * @module 11ty/eleventy/TemplateConfig
 */

/**
 * Config as used by the template.
 * @typedef {Object} module:11ty/eleventy/TemplateConfig~TemplateConfig~config
 * @property {String=} pathPrefix - The path prefix.
 */

/**
 * Object holding override information for the template config.
 * @typedef {Object} module:11ty/eleventy/TemplateConfig~TemplateConfig~override
 * @property {String=} pathPrefix - The path prefix.
 */

/**
 * Errors in eleventy config.
 */
class EleventyConfigError extends EleventyBaseError {}

/**
 * Errors in eleventy plugins.
 */
class EleventyPluginError extends EleventyBaseError {}

/**
 * Config for a template.
 *
 * @param {{}} customRootConfig - tbd.
 * @param {String} projectConfigPath - Path to local project config.
 */
class TemplateConfig {
  constructor(customRootConfig, projectConfigPath) {
    this.userConfig = new UserConfig();

    /** @member {module:11ty/eleventy/TemplateConfig~TemplateConfig~override} - tbd. */
    this.overrides = {};

    /**
     * @member {String} - Path to local project config.
     * @default .eleventy.js
     */
    this.projectConfigPath = projectConfigPath || ".eleventy.js";

    if (customRootConfig) {
      /**
       * @member {?{}} - Custom root config.
       */
      this.customRootConfig = customRootConfig;
      debug("Warning: Using custom root config!");
    } else {
      this.customRootConfig = null;
    }

    this.initializeRootConfig();
    this.hasConfigMerged = false;
  }

  /* Setter for Logger */
  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Normalises local project config file path.
   *
   * @method
   * @returns {String} - The normalised local project config file path.
   */
  getLocalProjectConfigFile() {
    return TemplatePath.addLeadingDotSlash(this.projectConfigPath);
  }

  get inputDir() {
    return this._inputDir;
  }

  set inputDir(inputDir) {
    this._inputDir = inputDir;
  }

  /**
   * Resets the configuration.
   */
  reset() {
    debugDev("Resetting configuration: TemplateConfig and UserConfig.");
    this.userConfig.reset();
    this.initializeRootConfig();
    this.forceReloadConfig();

    // Clear the compile cache
    eventBus.emit("eleventy.compileCacheReset");
  }

  /**
   * Resets the configuration while in watch mode.
   *
   * @todo Add implementation.
   */
  resetOnWatch() {
    // nothing yet
  }

  /**
   * Force a reload of the configuration object.
   */
  forceReloadConfig() {
    this.hasConfigMerged = false;
    this.getConfig();
  }

  /**
   * Returns the config object.
   *
   * @returns {{}} - The config object.
   */
  getConfig() {
    if (!this.hasConfigMerged) {
      debugDev("Merging via getConfig (first time)");
      this.config = this.mergeConfig();
      this.hasConfigMerged = true;
    }
    return this.config;
  }

  /**
   * Overwrites the config path.
   *
   * @param {String} path - The new config path.
   */
  setProjectConfigPath(path) {
    this.projectConfigPath = path;

    if (this.hasConfigMerged) {
      // merge it again
      debugDev(
        "Merging in getConfig again after setting the local project config path."
      );
      this.forceReloadConfig();
    }
  }

  /**
   * Overwrites the path prefix.
   *
   * @param {String} pathPrefix - The new path prefix.
   */
  setPathPrefix(pathPrefix) {
    debug("Setting pathPrefix to %o", pathPrefix);
    this.overrides.pathPrefix = pathPrefix;

    if (!this.hasConfigMerged) {
      this.forceReloadConfig();
    }
    this.config.pathPrefix = pathPrefix;
  }

  /**
   * Bootstraps the config object.
   */
  initializeRootConfig() {
    this.rootConfig = this.customRootConfig || require("./defaultConfig.js");
    if (typeof this.rootConfig === "function") {
      this.rootConfig = this.rootConfig.call(this, this.userConfig);
      // debug( "rootConfig is a function, after calling, this.userConfig is %o", this.userConfig );
    }
    debug("rootConfig %o", this.rootConfig);
  }

  /*
   * Process the userland plugins from the Config
   *
   * @param {Object} - the return Object from the user’s config file.
   */
  processPlugins({ dir }) {
    this.userConfig.dir = dir;

    if (this.logger) {
      this.userConfig.logger = this.logger;
    }

    // for Nested addPlugin calls, Issue #1925
    this.userConfig._enablePluginExecution();

    let storedActiveNamespace = this.userConfig.activeNamespace;
    for (let { plugin, options, pluginNamespace } of this.userConfig.plugins) {
      try {
        this.userConfig.activeNamespace = pluginNamespace;
        this.userConfig._executePlugin(plugin, options);
      } catch (e) {
        let name = this.userConfig._getPluginName(plugin);
        let namespaces = [storedActiveNamespace, pluginNamespace].filter(
          (entry) => !!entry
        );

        let namespaceStr = "";
        if (namespaces.length) {
          namespaceStr = ` (namespace: ${namespaces.join(".")})`;
        }

        throw new EleventyPluginError(
          `Error processing ${
            name ? `the \`${name}\`` : "a"
          } plugin${namespaceStr}`,
          e
        );
      }
    }

    this.userConfig.activeNamespace = storedActiveNamespace;
  }

  /**
   * Merges different config files together.
   *
   * @param {String} projectConfigPath - Path to project config.
   * @returns {{}} merged - The merged config file.
   */
  mergeConfig() {
    let localConfig = {};
    let path = TemplatePath.absolutePath(this.projectConfigPath);

    debug(`Merging config with ${path}`);

    if (fs.existsSync(path)) {
      try {
        // remove from require cache so it will grab a fresh copy
        deleteRequireCache(path);

        localConfig = require(path);
        // debug( "localConfig require return value: %o", localConfig );
        if (typeof localConfig === "function") {
          localConfig = localConfig(this.userConfig);
          // debug( "localConfig is a function, after calling, this.userConfig is %o", this.userConfig );

          if (
            typeof localConfig === "object" &&
            typeof localConfig.then === "function"
          ) {
            throw new EleventyConfigError(
              `Error in your Eleventy config file '${path}': Returning a promise is not yet supported.`
            );
          }
        }

        // Still using removed `filters`? this was renamed to transforms
        if (
          localConfig &&
          localConfig.filters !== undefined &&
          Object.keys(localConfig.filters).length
        ) {
          throw new EleventyConfigError(
            "The `filters` configuration option was renamed in Eleventy 0.3.3 and removed in Eleventy 1.0. Please use the `addTransform` configuration method instead. Read more: https://www.11ty.dev/docs/config/#transforms"
          );
        }
      } catch (err) {
        // TODO the error message here is bad and I feel bad (needs more accurate info)
        throw new EleventyConfigError(
          `Error in your Eleventy config file '${path}'.` +
            (err.message && err.message.includes("Cannot find module")
              ? chalk.cyan(" You may need to run `npm install`.")
              : ""),
          err
        );
      }
    } else {
      debug("Eleventy local project config file not found, skipping.");
    }

    let templateFormats = this.rootConfig.templateFormats || [];
    if (localConfig && localConfig.templateFormats) {
      templateFormats = localConfig.templateFormats;
      delete localConfig.templateFormats;
    }

    let mergedConfig = lodashMerge({}, this.rootConfig, localConfig);

    // Delay processing plugins until after the result of localConfig is returned
    // But BEFORE the rest of the config options are merged
    // this way we can pass directories and other template information to plugins

    // Temporarily restore templateFormats
    mergedConfig.templateFormats = templateFormats;
    this.processPlugins(mergedConfig);
    delete mergedConfig.templateFormats;

    let eleventyConfigApiMergingObject =
      this.userConfig.getMergingConfigObject();

    // `templateFormats` is via `setTemplateFormats`
    // `templateFormatsAdded` is via `addTemplateFormats`
    let templateFormatsAdded =
      eleventyConfigApiMergingObject.templateFormatsAdded || [];
    delete eleventyConfigApiMergingObject.templateFormatsAdded;
    if (
      eleventyConfigApiMergingObject &&
      eleventyConfigApiMergingObject.templateFormats
    ) {
      templateFormats = eleventyConfigApiMergingObject.templateFormats;
      delete eleventyConfigApiMergingObject.templateFormats;
    }

    lodashMerge(mergedConfig, eleventyConfigApiMergingObject);

    // debug("this.userConfig.getMergingConfigObject: %o", this.userConfig.getMergingConfigObject());
    // debug("mergedConfig: %o", mergedConfig);
    debug("overrides: %o", this.overrides);

    // Object assign overrides original values (good only for templateFormats) but not good for anything else
    if (this.overrides && this.overrides.templateFormats) {
      templateFormats = this.overrides.templateFormats;
      delete this.overrides.templateFormats;
    }
    lodashMerge(mergedConfig, this.overrides);

    // Additive should preserve original templateFormats, wherever those come from (config API or config return object)
    mergedConfig.templateFormats = lodashUniq([
      ...templateFormats,
      ...templateFormatsAdded,
    ]);

    debug("Current configuration: %o", mergedConfig);

    return mergedConfig;
  }
}

module.exports = TemplateConfig;
