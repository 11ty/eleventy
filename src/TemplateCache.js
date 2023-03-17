const { TemplatePath } = require("@11ty/eleventy-utils");

const eventBus = require("./EventBus");

// Note: this is only used for TemplateLayout right now but could be used for more
// Just be careful because right now the TemplateLayout cache keys are not directly mapped to paths
// So you may get collisions if you use this for other things.
class TemplateCache {
  constructor() {
    this.cache = {};
    this.cacheByInputPath = {};
  }

  clear() {
    this.cache = {};
    this.cacheByInputPath = {};
  }

  // alias
  removeAll() {
    this.clear();
  }

  size() {
    return Object.keys(this.cacheByInputPath).length;
  }

  add(layoutTemplate) {
    let keys = new Set();

    if (typeof layoutTemplate === "string") {
      throw new Error(
        "Invalid argument type passed to TemplateCache->add(). Should be a TemplateLayout."
      );
    }

    if ("getFullKey" in layoutTemplate) {
      keys.add(layoutTemplate.getFullKey());
    }

    if ("getKey" in layoutTemplate) {
      // if `key` was an alias, also set to the pathed layout value too
      // e.g. `layout: "default"` and `layout: "default.liquid"` will both map to the same template.
      keys.add(layoutTemplate.getKey());
    }

    for (let key of keys) {
      this.cache[key] = layoutTemplate;
    }

    // also the full template input path for use with eleventy --serve/--watch e.g. `_includes/default.liquid` (see `remove` below)
    let fullPath = TemplatePath.stripLeadingDotSlash(layoutTemplate.inputPath);
    this.cacheByInputPath[fullPath] = layoutTemplate;
  }

  has(key) {
    return key in this.cache;
  }

  get(key) {
    if (!this.has(key)) {
      throw new Error(`Could not find ${key} in TemplateCache.`);
    }

    return this.cache[key];
  }

  remove(layoutFilePath) {
    layoutFilePath = TemplatePath.stripLeadingDotSlash(layoutFilePath);
    if (!this.cacheByInputPath[layoutFilePath]) {
      // not a layout file
      return;
    }

    let layoutTemplate = this.cacheByInputPath[layoutFilePath];
    layoutTemplate.resetCaches();

    let keys = layoutTemplate.getCacheKeys();
    for (let key of keys) {
      delete this.cache[key];
    }

    delete this.cacheByInputPath[layoutFilePath];
  }
}

let layoutCache = new TemplateCache();

eventBus.on("eleventy.resourceModified", (path, usedBy, metadata = {}) => {
  // https://github.com/11ty/eleventy-plugin-bundle/issues/10
  if (metadata.viaConfigReset) {
    layoutCache.removeAll();
  } else {
    layoutCache.remove(path);
  }
});

// singleton
module.exports = layoutCache;
