class TemplateEngineManager {
  constructor() {}

  getClassNameFromTemplateKey(key) {
    let keys = {
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
    instance.engineManager = this;
    return instance;
  }
}

module.exports = TemplateEngineManager;
