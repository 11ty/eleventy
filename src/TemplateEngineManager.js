const EleventyBaseError = require("./EleventyBaseError");
class TemplateEngineManagerConfigError extends EleventyBaseError {}

class TemplateEngineManager {
  constructor(config) {
    if (!config) {
      throw new TemplateEngineManagerConfigError("Missing `config` argument.");
    }
    this.config = config;

    this.engineCache = {};
  }

  get keyToClassNameMap() {
    if (!this._keyToClassNameMap) {
      this._keyToClassNameMap = {
        ejs: "Ejs",
        md: "Markdown",
        html: "Html",
        hbs: "Handlebars",
        mustache: "Mustache",
        haml: "Haml",
        pug: "Pug",
        njk: "Nunjucks",
        liquid: "Liquid",
        "11ty.js": "JavaScript",
      };

      if ("extensionMap" in this.config) {
        for (let entry of this.config.extensionMap) {
          this._keyToClassNameMap[entry.key] = "Custom";
        }
      }
    }
    return this._keyToClassNameMap;
  }

  reset() {
    this.engineCache = {};
  }

  getClassNameFromTemplateKey(key) {
    let keys = this.keyToClassNameMap;

    return keys[key];
  }

  hasEngine(name) {
    return !!this.getClassNameFromTemplateKey(name);
  }

  getEngine(name, includesDir, extensionMap) {
    if (!this.hasEngine(name)) {
      throw new Error(
        `Template Engine ${name} does not exist in getEngine (includes dir: ${includesDir})`
      );
    }

    if (this.engineCache[name]) {
      return this.engineCache[name];
    }

    let cls;
    // We include these as raw strings (and not more readable variables) so they’re parsed by the bundler.
    if (name === "ejs") {
      cls = require("./Engines/Ejs");
    } else if (name === "md") {
      cls = require("./Engines/Markdown");
    } else if (name === "html") {
      cls = require("./Engines/Html");
    } else if (name === "hbs") {
      cls = require("./Engines/Handlebars");
    } else if (name === "mustache") {
      cls = require("./Engines/Mustache");
    } else if (name === "haml") {
      cls = require("./Engines/Haml");
    } else if (name === "pug") {
      cls = require("./Engines/Pug");
    } else if (name === "njk") {
      cls = require("./Engines/Nunjucks");
    } else if (name === "liquid") {
      cls = require("./Engines/Liquid");
    } else if (name === "11ty.js") {
      cls = require("./Engines/JavaScript");
    } else {
      cls = require("./Engines/Custom");
    }

    let instance = new cls(name, includesDir, this.config);
    instance.extensionMap = extensionMap;
    instance.engineManager = this;

    // Make sure cache key is based on name and not path
    // Custom class is used for all plugins, cache once per plugin
    this.engineCache[name] = instance;
    return instance;
  }
}

module.exports = TemplateEngineManager;
