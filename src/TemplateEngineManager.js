const config = require("./Config");

class TemplateEngineManager {
  constructor() {}

  get config() {
    if (!this._config) {
      this._config = config.getConfig();
    }
    return this._config;
  }

  set config(cfg) {
    this._config = cfg;
  }

  get keyToClassNameMap() {
    if (!this._keyToClassNameMap) {
      this._keyToClassNameMap = {
        ejs: "Ejs",
        md: "Markdown",
        jstl: "JavaScriptTemplateLiteral",
        html: "Html",
        hbs: "Handlebars",
        mustache: "Mustache",
        haml: "Haml",
        pug: "Pug",
        njk: "Nunjucks",
        liquid: "Liquid",
        "11ty.js": "JavaScript"
      };

      if ("extensionMap" in this.config) {
        for (let entry of this.config.extensionMap) {
          this._keyToClassNameMap[entry.key] = "Custom";
        }
      }
    }
    return this._keyToClassNameMap;
  }

  getClassNameFromTemplateKey(key) {
    let keys = this.keyToClassNameMap;

    return keys[key];
  }

  hasEngine(name) {
    return !!this.getClassNameFromTemplateKey(name);
  }

  getEngine(name, includesDir) {
    if (!this.hasEngine(name)) {
      throw new Error(
        `Template Engine ${name} does not exist in getEngine (includes dir: ${includesDir})`
      );
    }

    const cls = require("./Engines/" + this.getClassNameFromTemplateKey(name));
    let instance = new cls(name, includesDir);
    instance.config = this.config;
    instance.engineManager = this;
    return instance;
  }
}

module.exports = TemplateEngineManager;
