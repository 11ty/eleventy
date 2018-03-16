const EventEmitter = require("events");
const lodashget = require("lodash.get");
const Sortable = require("./Util/Sortable");
const chalk = require("chalk");
const debug = require("debug")("Eleventy:EleventyConfig");

// API to expose configuration options in config file
class EleventyConfig {
  constructor() {
    this.events = new EventEmitter();
    this.collections = {};

    this.liquidOptions = {};
    this.liquidTags = {};
    this.liquidFilters = {};
    this.nunjucksFilters = {};
    this.nunjucksAsyncFilters = {};
    this.handlebarsHelpers = {};
    this.passthroughCopies = {};
    this.pugOptions = {};

    this.layoutAliases = {};

    // now named `transforms` in API
    this.filters = {};
  }

  on(eventName, callback) {
    return this.events.on(eventName, callback);
  }

  emit(eventName, ...args) {
    return this.events.emit(eventName, ...args);
  }

  // tagCallback: function(liquidEngine) { return { parse: …, render: … }} };
  addLiquidTag(name, tagFn) {
    if (typeof tagFn !== "function") {
      throw new Error(
        "EleventyConfig.addLiquidTag expects a callback function to be passed in: addLiquidTag(name, function(liquidEngine) { return { parse: …, render: … } })"
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
    this.liquidTags[name] = tagFn;
  }

  addLiquidFilter(name, callback) {
    if (this.liquidFilters[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Liquid filter with `addLiquidFilter(%o)`"
        ),
        name
      );
    }

    this.liquidFilters[name] = callback;
  }

  addNunjucksAsyncFilter(name, callback) {
    if (this.nunjucksAsyncFilters[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Nunjucks filter with `addNunjucksAsyncFilter(%o)`"
        ),
        name
      );
    }

    this.nunjucksAsyncFilters[name] = callback;
  }

  // Support the nunjucks style syntax for asynchronous filter add
  addNunjucksFilter(name, callback, isAsync) {
    if (isAsync) {
      this.addNunjucksAsyncFilter(name, callback);
    } else {
      if (this.nunjucksFilters[name]) {
        debug(
          chalk.yellow(
            "Warning, overwriting a Nunjucks filter with `addNunjucksFilter(%o)`"
          ),
          name
        );
      }

      this.nunjucksFilters[name] = callback;
    }
  }

  addHandlebarsHelper(name, callback) {
    if (this.handlebarsHelpers[name]) {
      debug(
        chalk.yellow(
          "Warning, overwriting a Handlebars helper with `addHandlebarsHelper(%o)`"
        ),
        name
      );
    }

    this.handlebarsHelpers[name] = callback;
  }

  // TODO
  // getTemplateEngine(name) {
  // }

  addFilter(name, callback) {
    debug("Adding universal filter %o", name);
    this.addLiquidFilter(name, callback);
    this.addNunjucksFilter(name, callback);

    // these seem more akin to tags but they’re all handlebars has, so
    this.addHandlebarsHelper(name, callback);
  }

  addTransform(name, callback) {
    this.filters[name] = callback;
  }

  addLayoutAlias(from, to) {
    this.layoutAliases[from] = to;
  }

  getCollections() {
    return this.collections;
  }

  addCollection(name, callback) {
    if (this.collections[name]) {
      throw new Error(
        `config.addCollection(${name}) already exists. Try a different name for your collection.`
      );
    }

    this.collections[name] = callback;
  }

  addPlugin(pluginCallback) {
    if (typeof pluginCallback !== "function") {
      throw new Error(
        "EleventyConfig.addPlugin expects the first argument to be a function."
      );
    }

    pluginCallback(this);
  }

  /**
   * Adds a path to a file or directory to the list of pass-through copies
   * which are copied as-is to the output.
   *
   * @param {String} fileOrDir The path to the file or directory that should
   * be copied.
   * @returns {any} a reference to the `EleventyConfig` object.
   * @memberof EleventyConfig
   */
  addPassthroughCopy(fileOrDir) {
    this.passthroughCopies[fileOrDir] = true;

    return this;
  }

  setTemplateFormats(templateFormats) {
    if (typeof templateFormats === "string") {
      templateFormats = templateFormats.split(",").map(format => format.trim());
    }

    this.templateFormats = templateFormats;
  }

  setPugOptions(options) {
    this.pugOptions = options;
  }

  setLiquidOptions(options) {
    this.liquidOptions = options;
  }

  getMergingConfigObject() {
    return {
      liquidOptions: this.liquidOptions,
      liquidTags: this.liquidTags,
      liquidFilters: this.liquidFilters,
      nunjucksFilters: this.nunjucksFilters,
      nunjucksAsyncFilters: this.nunjucksAsyncFilters,
      handlebarsHelpers: this.handlebarsHelpers,
      filters: this.filters,
      layoutAliases: this.layoutAliases,
      passthroughCopies: this.passthroughCopies,
      templateFormats: this.templateFormats,
      pugOptions: this.pugOptions
    };
  }
}

let config = new EleventyConfig();

module.exports = config;
