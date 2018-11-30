const TemplatePath = require("./TemplatePath");
const config = require("./Config");

class EleventyExtensionMap {
  constructor(formats = []) {
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

  /* Used for layout path resolution */
  getFileList(path, dir) {
    if (!path) {
      return [];
    }

    let files = [];
    this.formats.forEach(
      function(key) {
        this.getExtensions(key).forEach(function(extension) {
          files.push((dir ? dir + "/" : "") + path + "." + extension);
        });
      }.bind(this)
    );

    return files;
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
    let globs = [];
    formats.forEach(
      function(key) {
        if (this.hasExtension(key)) {
          this.getExtensions(key).forEach(function(extension) {
            globs.push(dir + "/*." + extension);
          });
        } else {
          globs.push(dir + "/*." + key);
        }
      }.bind(this)
    );
    return globs;
  }

  hasExtension(key) {
    for (var extension in EleventyExtensionMap.keyMap) {
      if (EleventyExtensionMap.keyMap[extension] === key) {
        return true;
      }
    }
    return false;
  }

  getExtensions(key) {
    return this.getExtensionsFromKey(key);
  }

  getExtensionsFromKey(key) {
    let extensions = [];
    for (var extension in this.keyMap) {
      if (this.keyMap[extension] === key) {
        extensions.push(extension);
      }
    }
    return extensions;
  }

  getKey(pathOrKey) {
    return EleventyExtensionMap._getKey(pathOrKey, this.keyMap);
  }
  static getKey(pathOrKey) {
    return EleventyExtensionMap._getKey(pathOrKey, EleventyExtensionMap.keyMap);
  }
  static _getKey(pathOrKey, map) {
    pathOrKey = pathOrKey.toLowerCase();

    for (var extension in map) {
      let key = map[extension];
      if (pathOrKey === extension) {
        return key;
      } else if (pathOrKey.endsWith("." + extension)) {
        return key;
      }
    }
  }

  removeTemplateExtension(path) {
    return EleventyExtensionMap._removeTemplateExtension(path, this.keyMap);
  }
  static removeTemplateExtension(path) {
    return EleventyExtensionMap._removeTemplateExtension(
      path,
      EleventyExtensionMap.keyMap
    );
  }
  static _removeTemplateExtension(path, map) {
    for (var extension in map) {
      if (path === extension || path.endsWith("." + extension)) {
        return path.substr(0, path.length - 1 - extension.length);
      }
    }
    return path;
  }

  get keyMap() {
    return EleventyExtensionMap._getKeyMap(
      this.config.templateExtensionAliases
    );
  }

  static get keyMap() {
    return EleventyExtensionMap._getKeyMap(
      config.getConfig().templateExtensionAliases
    );
  }

  // file extension => key
  static _getKeyMap(aliases) {
    let fileExtensionToKeyMap = {
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
      "11ty.js": "11ty.js"
    };

    for (let extension in aliases) {
      fileExtensionToKeyMap[extension] = aliases[extension];
    }

    return fileExtensionToKeyMap;
  }
}

module.exports = EleventyExtensionMap;
