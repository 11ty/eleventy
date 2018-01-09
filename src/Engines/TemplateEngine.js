const globby = require("globby");
const fs = require("fs-extra");
const parsePath = require("parse-filepath");

class TemplateEngine {
  constructor(name, inputDir) {
    this.name = name;
    this.extension = "." + name;
    this.inputDir = inputDir;
    this.partials = this.cachePartialFiles(this.extension);
  }

  getName() {
    return this.name;
  }
  getInputDir() {
    return this.inputDir;
  }
  getPartials() {
    return this.partials;
  }

  cachePartialFiles() {
    let partials = {};
    // TODO: reuse mustache partials in handlebars?
    let partialFiles = this.inputDir
      ? globby.sync(this.inputDir + "/*" + this.extension)
      : [];
    for (let j = 0, k = partialFiles.length; j < k; j++) {
      let key = parsePath(partialFiles[j]).name;
      partials[key] = fs.readFileSync(partialFiles[j], "utf-8");
    }
    return partials;
  }

  async render(str, data) {
    let fn = await this.compile(str);
    return fn(data);
  }

  static getEngine(name, inputDir) {
    let classMap = {
      ejs: "Ejs",
      md: "Markdown",
      jstl: "JavaScript",
      html: "Html",
      hbs: "Handlebars",
      mustache: "Mustache",
      haml: "Haml",
      pug: "Pug",
      njk: "Nunjucks",
      liquid: "Liquid"
    };

    if (!(name in classMap)) {
      throw new Error(
        "Template Engine " + name + " does not exist in getEngine"
      );
    }

    const cls = require("./" + classMap[name]);
    return new cls(name, inputDir);
  }
}

module.exports = TemplateEngine;
