class TemplateCache {
  constructor() {
    this.cache = {};
  }

  clear() {
    this.cache = {};
  }

  size() {
    return Object.keys(this.cache).length;
  }

  add(inputPath, template) {
    this.cache[inputPath] = template;
  }

  has(inputPath) {
    return inputPath in this.cache;
  }

  get(inputPath) {
    if (!this.has(inputPath)) {
      throw new Error(`Could not find ${inputPath} in TemplateCache.`);
    }

    return this.cache[inputPath];
  }
}

// singleton
module.exports = new TemplateCache();
