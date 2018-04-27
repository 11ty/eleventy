class EleventyExtensionMap {
  constructor(formats) {
    this.formats = formats.filter(function(key) {
      return EleventyExtensionMap.hasExtension(key);
    });
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

  getGlobs(inputDir) {
    return this.formats.map(function(key) {
      return (
        (inputDir ? inputDir + "/" : "") +
        "**/*." +
        EleventyExtensionMap.getExtension(key)
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
