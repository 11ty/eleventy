const isPlainObject = require("lodash/isPlainObject");

class TemplateBehavior {
  constructor(config) {
    this.render = true;
    this.write = true;
    this.outputFormat = null;

    if (!config) {
      throw new Error("Missing config argument in TemplateBehavior");
    }
    this.config = config;
  }

  isRenderable() {
    return this.render || this.isRenderForced();
  }

  setOutputFormat(format) {
    this.outputFormat = format;
  }

  isRenderForced() {
    return this.outputFormat === "json" || this.outputFormat === "ndjson";
  }

  isWriteable() {
    return this.write;
  }

  isIncludedInCollections() {
    return this.isRenderable();
  }

  setRenderViaDataCascade(data) {
    // render is false *only* if `build` key does not exist in permalink objects (both in data and eleventyComputed)
    // (note that permalink: false means it won’t write but will still render)

    let keys = new Set();
    if (isPlainObject(data.permalink)) {
      keys.add(...Object.keys(data.permalink));
    }

    let computedKey = this.config.keys.computed;
    if (computedKey in data && isPlainObject(data[computedKey].permalink)) {
      keys.add(...Object.keys(data[computedKey].permalink));
    }

    if (keys.size) {
      this.render = keys.has("build");
    }
  }

  setFromPermalink(templatePermalink) {
    this.render = templatePermalink._isRendered;
    this.write = templatePermalink._writeToFileSystem;
  }
}
module.exports = TemplateBehavior;
