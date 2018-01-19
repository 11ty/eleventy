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
    this.handlebarsHelpers = {};

    // now named `transforms` in API
    this.filters = {};
  }

  on(eventName, callback) {
    return this.events.on(eventName, callback);
  }

  emit(eventName, ...args) {
    return this.events.emit(eventName, ...args);
  }

  addLiquidTag(name, parseCallback, renderCallback) {
    this.liquidTags[name] = {
      parse: parseCallback,
      render: renderCallback
    };
  }

  addLiquidFilter(name, callback) {
    this.liquidFilters[name] = callback;
  }

  addNunjucksFilter(name, callback) {
    this.nunjucksFilters[name] = callback;
  }

  addHandlebarsHelper(name, callback) {
    this.handlebarsHelpers[name] = callback;
  }

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
      handlebarsHelpers: this.handlebarsHelpers,
      filters: this.filters
    };
  }
}

let config = new EleventyConfig();

module.exports = config;
