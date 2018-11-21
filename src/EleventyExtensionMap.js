const TemplatePath = require("./TemplatePath");
const config = require("./Config");

class EleventyExtensionMap {
  constructor(formats) {
    this.config = config.getConfig();

    this.unfilteredFormats = formats.map(function(key) {
      return key.trim().toLowerCase();
    });

    this.formats = this.unfilteredFormats.filter(key => this.hasExtension(key));

    this.prunedFormats = this.unfilteredFormats.filter(
      key => !this.hasExtension(key)
    );
  }

  setConfig(configOverride) {
    this.config = configOverride || {};
  }

  getFileList(path, dir) {
    if (!path) {
      return [];
    }
    return this.formats.map(
      key => (dir ? dir + "/" : "") + path + "." + this.getExtension(key)
    );
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
    return formats.map(
      function(key) {
        return (
          TemplatePath.convertToGlob(inputDir) +
          "/*." +
          (this.hasExtension(key) ? this.getExtension(key) : key)
        );
      }.bind(this)
    );
  }

  hasExtension(key) {
    return key in this.keyMapToExtension;
  }

  getExtension(key) {
    return this.keyMapToExtension[key];
  }

  static getExtensionFromKey(key) {
    return EleventyExtensionMap.keyMap[key];
  }

  static getExtensionFromPath(path) {
    for (var key in EleventyExtensionMap.keyMap) {
      if (path.endsWith("." + EleventyExtensionMap.keyMap[key])) {
        return EleventyExtensionMap.keyMap[key];
      }
    }
  }

  static getKey(pathOrKey) {
    pathOrKey = pathOrKey.toLowerCase();

    let hasDot = pathOrKey.indexOf(".") > -1;
    for (var key in EleventyExtensionMap.keyMap) {
      if (!hasDot && pathOrKey === key) {
        return key;
      } else if (pathOrKey.endsWith("." + EleventyExtensionMap.keyMap[key])) {
        return key;
      }
    }
  }

  static removeTemplateExtension(path) {
    for (var key in EleventyExtensionMap.keyMap) {
      if (path.endsWith(EleventyExtensionMap.keyMap[key])) {
        return path.substr(
          0,
          path.length - 1 - EleventyExtensionMap.keyMap[key].length
        );
      }
    }
    return path;
  }

  // key => file extension
  static get keyMap() {
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

  get keyMapToExtension() {
    return EleventyExtensionMap.keyMap;
  }
}

module.exports = EleventyExtensionMap;
