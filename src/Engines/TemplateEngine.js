const globby = require("globby");
const fs = require("fs-extra");
const parsePath = require("parse-filepath");
const debug = require("debug")("TemplateEngine");

class TemplateEngine {
  constructor(name, inputDir) {
    this.name = name;
    this.extension = "." + name;
    this.inputDir = inputDir;
    this.partialsHaveBeenCached = false;
    this.partials = [];
  }

  getName() {
    return this.name;
  }
  getInputDir() {
    return this.inputDir;
  }
  getPartials() {
    if (!this.partialsHaveBeenCached) {
      this.partials = this.cachePartialFiles();
    }

    return this.partials;
  }

  cachePartialFiles() {
    this.partialsHaveBeenCached = true;

    let partials = {};
    // TODO: reuse mustache partials in handlebars?
    let partialFiles = this.inputDir
      ? globby.sync(this.inputDir + "/*" + this.extension)
      : [];
    for (let j = 0, k = partialFiles.length; j < k; j++) {
      let key = parsePath(partialFiles[j]).name;
      partials[key] = fs.readFileSync(partialFiles[j], "utf-8");
    }

    debug(
      `${this.inputDir}/*${this.extension} found partials for: %o`,
      Object.keys(this.partials)
    );
    return partials;
  }

  async render(str, data) {
    let fn = await this.compile(str);
    return fn(data);
  }

  static get engineMap() {
    return {
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
  }

  static hasEngine(name) {
    return name in TemplateEngine.engineMap;
  }

  static getEngine(name, inputDir) {
    if (!(name in TemplateEngine.engineMap)) {
      throw new Error(
        "Template Engine " + name + " does not exist in getEngine"
      );
    }

    // TODO don’t require this every time
    const cls = require("./" + TemplateEngine.engineMap[name]);
    return new cls(name, inputDir);
  }
}

module.exports = TemplateEngine;
