const EventEmitter = require("events");
const lodashget = require("lodash.get");
const Sortable = require("./Util/Sortable");
const debug = require("debug")("Eleventy:EleventyConfig");

// API to expose configuration options in config file
class EleventyConfig {
  constructor() {
    this.events = new EventEmitter();
    this.collections = {};

    this.liquidTags = {};
    this.liquidFilters = {};
    this.nunjucksFilters = {};
    this.nunjucksAsyncFilters = {};
    this.handlebarsHelpers = {};

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

    this.liquidTags[name] = tagFn;
  }

  addLiquidFilter(name, callback) {
    this.liquidFilters[name] = callback;
  }

  addNunjucksFilter(name, callback, isAsync) {
    if (isAsync) {
      this.nunjucksAsyncFilters[name] = callback;
    } else {
      this.nunjucksFilters[name] = callback;
    }
  }

  addHandlebarsHelper(name, callback) {
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

  getMergingConfigObject() {
    return {
      liquidTags: this.liquidTags,
      liquidFilters: this.liquidFilters,
      nunjucksFilters: this.nunjucksFilters,
      nunjucksAsyncFilters: this.nunjucksAsyncFilters,
      handlebarsHelpers: this.handlebarsHelpers,
      filters: this.filters,
      layoutAliases: this.layoutAliases
    };
  }
}

let config = new EleventyConfig();

module.exports = config;
