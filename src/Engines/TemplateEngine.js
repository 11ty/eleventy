const fastglob = require("fast-glob");
const fs = require("fs-extra");
const TemplatePath = require("../TemplatePath");
const EleventyExtensionMap = require("../EleventyExtensionMap");
const config = require("../Config");
const debug = require("debug")("Eleventy:TemplateEngine");

class TemplateEngine {
  constructor(name, inputDir) {
    this.name = name;

    this.extensionMap = new EleventyExtensionMap();
    this.extensions = this.extensionMap.getExtensionsFromKey(name);
    this.inputDir = inputDir;
    this.partialsHaveBeenCached = false;
    this.partials = [];
    this.engineLib = null;
  }

  get config() {
    if (!this._config) {
      this._config = config.getConfig();
    }
    return this._config;
  }

  set config(config) {
    this._config = config;
  }

  getName() {
    return this.name;
  }

  getInputDir() {
    return this.inputDir;
  }

  // TODO make async
  getPartials() {
    if (!this.partialsHaveBeenCached) {
      this.partials = this.cachePartialFiles();
    }

    return this.partials;
  }

  // TODO make async
  cachePartialFiles() {
    // This only runs if getPartials() is called, which is only for Mustache/Handlebars
    this.partialsHaveBeenCached = true;
    let partials = {};
    let prefix = this.inputDir + "/**/*.";
    // TODO: reuse mustache partials in handlebars?
    let partialFiles = [];
    if (this.inputDir) {
      this.extensions.forEach(function(extension) {
        partialFiles = partialFiles.concat(fastglob.sync(prefix + extension));
      });
    }

    partialFiles = TemplatePath.addLeadingDotSlashArray(partialFiles);

    for (let j = 0, k = partialFiles.length; j < k; j++) {
      let partialPath = TemplatePath.stripLeadingSubPath(
        partialFiles[j],
        this.inputDir
      );
      let partialPathNoExt = partialPath;
      this.extensions.forEach(function(extension) {
        partialPathNoExt = TemplatePath.removeExtension(
          partialPathNoExt,
          "." + extension
        );
      });
      partials[partialPathNoExt] = fs.readFileSync(partialFiles[j], "utf-8");
    }

    debug(
      `${this.inputDir}/*.{${this.extensions}} found partials for: %o`,
      Object.keys(partials)
    );

    return partials;
  }

  setEngineLib(engineLib) {
    this.engineLib = engineLib;
  }

  getEngineLib() {
    return this.engineLib;
  }

  async render(str, data) {
    /* TODO compile needs to pass in inputPath? */
    let fn = await this.compile(str);
    return fn(data);
  }

  // JavaScript files defer to the module loader rather than read the files to strings
  needsToReadFileContents() {
    return true;
  }

  getExtraDataFromFile(inputPath) {
    return {};
  }

  initRequireCache(inputPath) {
    // do nothing
  }

  static get templateKeyMapToClassName() {
    return {
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
  }

  static hasEngine(name) {
    return name in TemplateEngine.templateKeyMapToClassName;
  }

  static getEngine(name, inputDir) {
    if (!this.hasEngine(name)) {
      throw new Error(
        `Template Engine ${name} does not exist in getEngine (input dir: ${inputDir})`
      );
    }

    const cls = require("./" + TemplateEngine.templateKeyMapToClassName[name]);
    return new cls(name, inputDir);
  }
}

module.exports = TemplateEngine;
