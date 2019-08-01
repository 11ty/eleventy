const EventEmitter = require("events");
const chalk = require("chalk");
const semver = require("semver");
const { DateTime } = require("luxon");
const EleventyBaseError = require("./EleventyBaseError");
const bench = require("./BenchmarkManager").get("Configuration");
const debug = require("debug")("Eleventy:UserConfig");
const pkg = require("../package.json");

class UserConfigError extends EleventyBaseError {}

// API to expose configuration options in config file
class UserConfig {
  constructor() {
    this.reset();
  }

  reset() {
    debug("Resetting EleventyConfig to initial values.");
    this.events = new EventEmitter();
    this.collections = {};

    this.liquidOptions = {};
    this.liquidTags = {};
    this.liquidFilters = {};
    this.liquidShortcodes = {};
    this.liquidPairedShortcodes = {};
    this.nunjucksFilters = {};
    this.nunjucksAsyncFilters = {};
    this.nunjucksTags = {};
    this.nunjucksShortcodes = {};
    this.nunjucksPairedShortcodes = {};
    this.handlebarsHelpers = {};
    this.handlebarsShortcodes = {};
    this.handlebarsPairedShortcodes = {};
    this.javascriptFunctions = {};
    this.pugOptions = {};
    this.ejsOptions = {};
    this.markdownHighlighter = null;
    this.libraryOverrides = {};

    this.passthroughCopies = {};
    this.layoutAliases = {};
    this.linters = {};
    // now named `transforms` in API
    this.filters = {};
    this.activeNamespace = "";
    this.DateTime = DateTime;
    this.dynamicPermalinks = true;
    this.useGitIgnore = true;
    this.dataDeepMerge = false;
    this.experiments = new Set();
    // this.userExtensionMap = {};
    // this.templateExtensionAliases = {};
    this.watchJavaScriptDependencies = true;
    this.additionalWatchTargets = [];
    this.browserSyncConfig = {};
  }

  versionCheck(expected) {
    if (!semver.satisfies(pkg.version, expected)) {
      throw new UserConfigError(
        `This project requires the eleventy version to match '${expected}' but found ${pkg.version}. Use \`npm update @11ty/eleventy -g\` to upgrade the eleventy global or \`npm update @11ty/eleventy --save\` to upgrade your local project version.`
      );
    }
  }

  on(eventName, callback) {
    return this.events.on(eventName, callback);
  }

  emit(eventName, ...args) {
    return this.events.emit(eventName, ...args);
  }

  // This is a method for plugins, probably shouldn’t use this in projects.
  // Projects should use `setLibrary` as documented here:
  // https://github.com/11ty/eleventy/blob/master/docs/engines/markdown.md#use-your-own-options
  addMarkdownHighlighter(highlightFn) {
    this.markdownHighlighter = highlightFn;
  }

  // tagCallback: function(liquidEngine) { return { parse: …, render: … }} };
  addLiquidTag(name, tagFn) {
    name = this.getNamespacedName(name);

    if (typeof tagFn !== "function") {
      throw new UserConfigError(
        `EleventyConfig.addLiquidTag expects a callback function to be passed in for ${name}: addLiquidTag(name, function(liquidEngine) { return { parse: …, render: … } })`
      );
    }

    if (this.liquidTags[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Liquid tag with `addLiquidTag(%o)`"
        ),
        name
      );
    }
    this.liquidTags[name] = bench.add(`"${name}" Liquid Custom Tag`, tagFn);
  }

  addLiquidFilter(name, callback) {
    name = this.getNamespacedName(name);

    if (this.liquidFilters[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Liquid filter with `addLiquidFilter(%o)`"
        ),
        name
      );
    }

    this.liquidFilters[name] = bench.add(`"${name}" Liquid Filter`, callback);
  }

  addNunjucksAsyncFilter(name, callback) {
    name = this.getNamespacedName(name);

    if (this.nunjucksAsyncFilters[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Nunjucks filter with `addNunjucksAsyncFilter(%o)`"
        ),
        name
      );
    }

    this.nunjucksAsyncFilters[name] = bench.add(
      `"${name}" Nunjucks Async Filter`,
      callback
    );
  }

  // Support the nunjucks style syntax for asynchronous filter add
  addNunjucksFilter(name, callback, isAsync) {
    if (isAsync) {
      // namespacing happens downstream
      this.addNunjucksAsyncFilter(name, callback);
    } else {
      name = this.getNamespacedName(name);

      if (this.nunjucksFilters[name]) {
        debug(
          chalk.yellow(
            "Warning, overwriting a Nunjucks filter with `addNunjucksFilter(%o)`"
          ),
          name
        );
      }

      this.nunjucksFilters[name] = bench.add(
        `"${name}" Nunjucks Filter`,
        callback
      );
    }
  }

  addHandlebarsHelper(name, callback) {
    name = this.getNamespacedName(name);

    if (this.handlebarsHelpers[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Handlebars helper with `addHandlebarsHelper(%o)`."
        ),
        name
      );
    }

    this.handlebarsHelpers[name] = bench.add(
      `"${name}" Handlebars Helper`,
      callback
    );
  }

  addFilter(name, callback) {
    debug("Adding universal filter %o", this.getNamespacedName(name));

    // namespacing happens downstream
    this.addLiquidFilter(name, callback);
    this.addNunjucksFilter(name, callback);
    this.addJavaScriptFunction(name, callback);

    // TODO remove Handlebars helpers in Universal Filters. Use shortcodes instead (the Handlebars template syntax is the same).
    this.addHandlebarsHelper(name, callback);
  }

  addNunjucksTag(name, tagFn) {
    name = this.getNamespacedName(name);

    if (typeof tagFn !== "function") {
      throw new UserConfigError(
        `EleventyConfig.addNunjucksTag expects a callback function to be passed in for ${name}: addNunjucksTag(name, function(nunjucksEngine) {})`
      );
    }

    if (this.nunjucksTags[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Nunjucks tag with `addNunjucksTag(%o)`"
        ),
        name
      );
    }

    this.nunjucksTags[name] = bench.add(`"${name}" Nunjucks Custom Tag`, tagFn);
  }

  addTransform(name, callback) {
    name = this.getNamespacedName(name);

    // these are now called transforms
    // this naming is kept here for backwards compatibility
    // TODO major version change
    this.filters[name] = callback;
  }

  addLinter(name, callback) {
    name = this.getNamespacedName(name);

    this.linters[name] = callback;
  }

  addLayoutAlias(from, to) {
    this.layoutAliases[from] = to;
  }

  // get config defined collections
  getCollections() {
    return this.collections;
  }

  addCollection(name, callback) {
    name = this.getNamespacedName(name);

    if (this.collections[name]) {
      throw new UserConfigError(
        `config.addCollection(${name}) already exists. Try a different name for your collection.`
      );
    }

    this.collections[name] = callback;
  }

  addPlugin(plugin, options) {
    debug("Adding plugin (unknown name: check your config file).");
    if (typeof plugin === "function") {
      plugin(this);
    } else if (plugin && plugin.configFunction) {
      if (options && typeof options.init === "function") {
        options.init.call(this, plugin.initArguments || {});
      }

      plugin.configFunction(this, options);
    } else {
      throw new UserConfigError(
        "Invalid EleventyConfig.addPlugin signature. Should be a function or a valid Eleventy plugin object."
      );
    }
  }

  getNamespacedName(name) {
    return this.activeNamespace + name;
  }

  namespace(pluginNamespace, callback) {
    let validNamespace = pluginNamespace && typeof pluginNamespace === "string";
    if (validNamespace) {
      this.activeNamespace = pluginNamespace || "";
    }

    callback();

    if (validNamespace) {
      this.activeNamespace = "";
    }
  }

  /**
   * Adds a path to a file or directory to the list of pass-through copies
   * which are copied as-is to the output.
   *
   * @param {string|object} fileOrDir The path to the file or directory that should
   * be copied. OR an object where the key is the input glob and the property is the output directory
   * @returns {any} a reference to the `EleventyConfig` object.
   * @memberof EleventyConfig
   */
  addPassthroughCopy(fileOrDir) {
    if (fileOrDir instanceof Object) {
      this.passthroughCopies = {
        ...this.passthroughCopies,
        ...fileOrDir
      };
    } else {
      // Glob patterns will not work string method
      this.passthroughCopies[fileOrDir] = fileOrDir;
    }

    return this;
  }

  setTemplateFormats(templateFormats) {
    if (typeof templateFormats === "string") {
      templateFormats = templateFormats.split(",").map(format => format.trim());
    }

    this.templateFormats = templateFormats;
  }

  setLibrary(engineName, libraryInstance) {
    // Pug options are passed to `compile` and not in the library constructor so we don’t need to warn
    if (engineName === "liquid" && this.mdOptions) {
      debug(
        "WARNING: using `eleventyConfig.setLibrary` will override any configuration set using `.setLiquidOptions` or with the `liquidOptions` key in the config object. You’ll need to pass these options to the library yourself."
      );
    }

    this.libraryOverrides[engineName.toLowerCase()] = libraryInstance;
  }

  setPugOptions(options) {
    this.pugOptions = options;
  }

  setLiquidOptions(options) {
    this.liquidOptions = options;
  }

  setEjsOptions(options) {
    this.ejsOptions = options;
  }

  setDynamicPermalinks(enabled) {
    this.dynamicPermalinks = !!enabled;
  }

  setUseGitIgnore(enabled) {
    this.useGitIgnore = !!enabled;
  }

  addShortcode(name, callback) {
    debug("Adding universal shortcode %o", this.getNamespacedName(name));
    this.addNunjucksShortcode(name, callback);
    this.addLiquidShortcode(name, callback);
    this.addHandlebarsShortcode(name, callback);
    this.addJavaScriptFunction(name, callback);
  }

  addNunjucksShortcode(name, callback) {
    name = this.getNamespacedName(name);

    if (this.nunjucksShortcodes[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Nunjucks Shortcode with `addNunjucksShortcode(%o)`"
        ),
        name
      );
    }

    this.nunjucksShortcodes[name] = bench.add(
      `"${name}" Nunjucks Shortcode`,
      callback
    );
  }

  addLiquidShortcode(name, callback) {
    name = this.getNamespacedName(name);

    if (this.liquidShortcodes[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Liquid Shortcode with `addLiquidShortcode(%o)`"
        ),
        name
      );
    }

    this.liquidShortcodes[name] = bench.add(
      `"${name}" Liquid Shortcode`,
      callback
    );
  }

  addHandlebarsShortcode(name, callback) {
    name = this.getNamespacedName(name);

    if (this.handlebarsShortcodes[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Handlebars Shortcode with `addHandlebarsShortcode(%o)`"
        ),
        name
      );
    }

    this.handlebarsShortcodes[name] = bench.add(
      `"${name}" Handlebars Shortcode`,
      callback
    );
  }

  addPairedShortcode(name, callback) {
    this.addPairedNunjucksShortcode(name, callback);
    this.addPairedLiquidShortcode(name, callback);
    this.addPairedHandlebarsShortcode(name, callback);
    this.addJavaScriptFunction(name, callback);
  }

  addPairedNunjucksShortcode(name, callback) {
    name = this.getNamespacedName(name);

    if (this.nunjucksPairedShortcodes[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Nunjucks Paired Shortcode with `addPairedNunjucksShortcode(%o)`"
        ),
        name
      );
    }

    this.nunjucksPairedShortcodes[name] = bench.add(
      `"${name}" Nunjucks Paired Shortcode`,
      callback
    );
  }

  addPairedLiquidShortcode(name, callback) {
    name = this.getNamespacedName(name);

    if (this.liquidPairedShortcodes[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Liquid Paired Shortcode with `addPairedLiquidShortcode(%o)`"
        ),
        name
      );
    }

    this.liquidPairedShortcodes[name] = bench.add(
      `"${name}" Liquid Paired Shortcode`,
      callback
    );
  }

  addPairedHandlebarsShortcode(name, callback) {
    name = this.getNamespacedName(name);

    if (this.handlebarsPairedShortcodes[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Handlebars Paired Shortcode with `addPairedHandlebarsShortcode(%o)`"
        ),
        name
      );
    }

    this.handlebarsPairedShortcodes[name] = bench.add(
      `"${name}" Handlebars Paired Shortcode`,
      callback
    );
  }

  addJavaScriptFunction(name, callback) {
    name = this.getNamespacedName(name);

    if (this.javascriptFunctions[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a JavaScript template function with `addJavaScriptFunction(%o)`"
        ),
        name
      );
    }

    this.javascriptFunctions[name] = bench.add(
      `"${name}" JavaScript Function`,
      callback
    );
  }

  addExperiment(key) {
    this.experiments.add(key);
  }

  setDataDeepMerge(deepMerge) {
    this.dataDeepMerge = !!deepMerge;
  }

  // addTemplateExtensionAlias(targetKey, extension) {
  //   this.templateExtensionAliases[extension] = targetKey;
  // }

  addWatchTarget(additionalWatchTargets) {
    this.additionalWatchTargets.push(additionalWatchTargets);
  }

  setWatchJavaScriptDependencies(watchEnabled) {
    this.watchJavaScriptDependencies = !!watchEnabled;
  }

  setBrowserSyncConfig(options = {}) {
    this.browserSyncConfig = options;
  }

  setFrontMatterParsingOptions(options = {}) {
    this.frontMatterParsingOptions = options;
  }

  getMergingConfigObject() {
    return {
      templateFormats: this.templateFormats,
      filters: this.filters, // now called transforms
      linters: this.linters,
      layoutAliases: this.layoutAliases,
      passthroughCopies: this.passthroughCopies,
      liquidOptions: this.liquidOptions,
      liquidTags: this.liquidTags,
      liquidFilters: this.liquidFilters,
      liquidShortcodes: this.liquidShortcodes,
      liquidPairedShortcodes: this.liquidPairedShortcodes,
      nunjucksFilters: this.nunjucksFilters,
      nunjucksAsyncFilters: this.nunjucksAsyncFilters,
      nunjucksTags: this.nunjucksTags,
      nunjucksShortcodes: this.nunjucksShortcodes,
      nunjucksPairedShortcodes: this.nunjucksPairedShortcodes,
      handlebarsHelpers: this.handlebarsHelpers,
      handlebarsShortcodes: this.handlebarsShortcodes,
      handlebarsPairedShortcodes: this.handlebarsPairedShortcodes,
      javascriptFunctions: this.javascriptFunctions,
      pugOptions: this.pugOptions,
      ejsOptions: this.ejsOptions,
      markdownHighlighter: this.markdownHighlighter,
      libraryOverrides: this.libraryOverrides,
      dynamicPermalinks: this.dynamicPermalinks,
      useGitIgnore: this.useGitIgnore,
      dataDeepMerge: this.dataDeepMerge,
      experiments: this.experiments,
      // templateExtensionAliases: this.templateExtensionAliases,
      watchJavaScriptDependencies: this.watchJavaScriptDependencies,
      additionalWatchTargets: this.additionalWatchTargets,
      browserSyncConfig: this.browserSyncConfig,
      frontMatterParsingOptions: this.frontMatterParsingOptions
    };
  }

  // addExtension(fileExtension, userClass) {
  //   this.userExtensionMap[ fileExtension ] = userClass;
  // }
}

module.exports = UserConfig;
