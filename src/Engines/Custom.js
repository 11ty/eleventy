const TemplateEngine = require("./TemplateEngine");

class CustomEngine extends TemplateEngine {
  constructor(name, includesDir) {
    super(name, includesDir);

    this.entry = this.getExtensionMapEntry();
    this.needsInit =
      "init" in this.entry && typeof this.entry.init === "function";
    this.initFinished = false;
  }

  getExtensionMapEntry() {
    if ("extensionMap" in this.config) {
      for (let entry of this.config.extensionMap) {
        if (entry.key.toLowerCase() === this.name.toLowerCase()) {
          return entry;
        }
      }
    }

    throw Error(
      `Could not find a custom extension for ${this.name}. Did you add it to your config file?`
    );
  }

  needsToReadFileContents() {
    if ("read" in this.entry) {
      return this.entry.read;
    }
    return true;
  }

  async compile(str, inputPath) {
    if (this.needsInit && !this.initFinished) {
      await this.entry.init();
      this.initFinished = true;
    }

    // TODO generalize this (look at JavaScript.js)
    return this.entry.compile(str, inputPath);
  }

  get defaultTemplateFileExtension() {
    return this.entry.outputFileExtension;
  }
}

module.exports = CustomEngine;
