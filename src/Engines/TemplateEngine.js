const fastglob = require("fast-glob");
const fs = require("fs-extra");
const TemplatePath = require("../TemplatePath");
const EleventyExtensionMap = require("../EleventyExtensionMap");
const config = require("../Config");
const debug = require("debug")("Eleventy:TemplateEngine");

class TemplateEngine {
  constructor(name, includesDir) {
    this.name = name;

    this.extensionMap = new EleventyExtensionMap();
    this.extensions = this.extensionMap.getExtensionsFromKey(name);
    this.includesDir = includesDir;
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

  getIncludesDir() {
    return this.includesDir;
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
    let prefix = this.includesDir + "/**/*.";
    // TODO: reuse mustache partials in handlebars?
    let partialFiles = [];
    if (this.includesDir) {
      this.extensions.forEach(function(extension) {
        partialFiles = partialFiles.concat(
          fastglob.sync(prefix + extension, {
            caseSensitiveMatch: false,
            dot: true
          })
        );
      });
    }

    partialFiles = TemplatePath.addLeadingDotSlashArray(partialFiles);

    for (let j = 0, k = partialFiles.length; j < k; j++) {
      let partialPath = TemplatePath.stripLeadingSubPath(
        partialFiles[j],
        this.includesDir
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
      `${this.includesDir}/*.{${this.extensions}} found partials for: %o`,
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

  async _testRender(str, data) {
    /* TODO compile needs to pass in inputPath? */
    try {
      let fn = await this.compile(str);
      return fn(data);
    } catch (e) {
      return Promise.reject(e);
    }
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

  static getEngine(name, includesDir) {
    if (!this.hasEngine(name)) {
      throw new Error(
        `Template Engine ${name} does not exist in getEngine (includes dir: ${includesDir})`
      );
    }

    const cls = require("./" + TemplateEngine.templateKeyMapToClassName[name]);
    return new cls(name, includesDir);
  }
}

module.exports = TemplateEngine;
