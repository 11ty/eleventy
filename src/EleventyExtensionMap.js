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
    let dir = TemplatePath.convertToGlob(inputDir);
    return formats.map(
      function(key) {
        return (
          dir + "/*." + (this.hasExtension(key) ? this.getExtension(key) : key)
        );
      }.bind(this)
    );
  }

  hasExtension(key) {
    for (var extension in EleventyExtensionMap.keyMap) {
      if (EleventyExtensionMap.keyMap[extension] === key) {
        return true;
      }
    }
    return false;
  }

  getExtension(key) {
    for (var extension in EleventyExtensionMap.keyMap) {
      if (EleventyExtensionMap.keyMap[extension] === key) {
        return extension;
      }
    }
  }

  static getExtensionFromKey(key) {
    for (var extension in EleventyExtensionMap.keyMap) {
      if (EleventyExtensionMap.keyMap[extension] === key) {
        return extension;
      }
    }
  }

  static getExtensionFromPath(path) {
    for (var extension in EleventyExtensionMap.keyMap) {
      if (path.endsWith("." + extension)) {
        return extension;
      }
    }
  }

  static getKey(pathOrKey) {
    pathOrKey = pathOrKey.toLowerCase();

    for (var extension in EleventyExtensionMap.keyMap) {
      let key = EleventyExtensionMap.keyMap[extension];
      if (pathOrKey === extension) {
        return key;
      } else if (pathOrKey.endsWith("." + extension)) {
        return key;
      }
    }
  }

  static removeTemplateExtension(path) {
    for (var extension in EleventyExtensionMap.keyMap) {
      if (path === extension || path.endsWith("." + extension)) {
        return path.substr(0, path.length - 1 - extension.length);
      }
    }
    return path;
  }

  // file extension => key
  static get keyMap() {
    let fileExtensionToKeyMap = {
      ejs: "ejs",
      md: "md",
      markdown: "md",
      jstl: "jstl",
      html: "html",
      hbs: "hbs",
      mustache: "mustache",
      haml: "haml",
      pug: "pug",
      njk: "njk",
      liquid: "liquid"
    };

    let jsSuffix = TemplatePath.stripLeadingDots(
      config.getConfig().jsTemplateFileSuffix + ".js"
    );
    fileExtensionToKeyMap[jsSuffix] = "11ty.js";

    return fileExtensionToKeyMap;
  }
}

module.exports = EleventyExtensionMap;
