const TemplateEngine = require("./TemplateEngine");

class CustomEngine extends TemplateEngine {
  constructor(name, includesDir) {
    super(name, includesDir);
  }

  get compileFunction() {
    for (let entry of this.config.extensionMap) {
      if (entry.key.toLowerCase() === this.name.toLowerCase()) {
        return entry.compile;
      }
    }

    throw Error(
      `Could not find a custom extension for ${this.name}. Did you add it to your config file?`
    );
  }

  async compile(str, inputPath) {
    // TODO generalize this (look at JavaScript.js)
    return this.compileFunction(str, inputPath);
  }
}

module.exports = CustomEngine;
