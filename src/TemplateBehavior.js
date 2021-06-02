class TemplateBehavior {
  constructor() {
    this.render = true;
    this.write = true;
    this.outputFormat = null;
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

  setFromPermalink(templatePermalink) {
    this.render = templatePermalink._isRendered;
    this.write = templatePermalink._writeToFileSystem;
  }
}
module.exports = TemplateBehavior;
