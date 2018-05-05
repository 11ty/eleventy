const TemplatePath = require("./TemplatePath");
const config = require("./Config");

class EleventyExtensionMap {
  constructor(formats) {
    this.config = config.getConfig();

    this.unfilteredFormats = formats.map(function(key) {
      return key.trim().toLowerCase();
    });

    this.formats = this.unfilteredFormats.filter(function(key) {
      return EleventyExtensionMap.hasExtension(key);
    });

    this.prunedFormats = this.unfilteredFormats.filter(function(key) {
      return !EleventyExtensionMap.hasExtension(key);
    });
  }

  setConfig(configOverride) {
    this.config = configOverride || {};
  }

  getFileList(path, dir) {
    if (!path) {
      return [];
    }
    return this.formats.map(function(key) {
      return (
        (dir ? dir + "/" : "") +
        path +
        "." +
        EleventyExtensionMap.getExtension(key)
      );
    });
  }

  getPrunedGlobs(inputDir) {
    return this._getGlobs(this.prunedFormats, inputDir);
  }

  getGlobs(inputDir) {
    if (this.config.passthroughFileCopy) {
      return this._getGlobs(this.unfilteredFormats, inputDir);
    }

    return this._getGlobs(this.formats, inputDir);
  }

  _getGlobs(formats, inputDir) {
    return formats.map(function(key) {
      return (
        TemplatePath.convertToGlob(inputDir) +
        "/*." +
        (EleventyExtensionMap.hasExtension(key)
          ? EleventyExtensionMap.getExtension(key)
          : key)
      );
    });
  }

  static hasExtension(key) {
    return key in this.keyMapToExtension;
  }

  static getExtension(key) {
    return this.keyMapToExtension[key];
  }

  static get keyMapToExtension() {
    return {
      ejs: "ejs",
      md: "md",
      jstl: "jstl",
      html: "html",
      hbs: "hbs",
      mustache: "mustache",
      haml: "haml",
      pug: "pug",
      njk: "njk",
      liquid: "liquid",
      js: "11ty.js"
    };
  }
}

module.exports = EleventyExtensionMap;
