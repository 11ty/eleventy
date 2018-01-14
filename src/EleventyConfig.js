const EventEmitter = require("events");
const lodashget = require("lodash.get");
const Sortable = require("./Util/Sortable");

// API to expose configuration options in config file
class EleventyConfig {
  constructor() {
    this.events = new EventEmitter();
    this.collections = {};
  }

  on(eventName, callback) {
    return this.events.on(eventName, callback);
  }

  emit(eventName, ...args) {
    return this.events.emit(eventName, ...args);
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
}

let config = new EleventyConfig();

module.exports = config;
