const PugLib = require("pug");
const TemplateEngine = require("./TemplateEngine");
const TemplatePath = require("../TemplatePath");

class Pug extends TemplateEngine {
  constructor(name, includesDir) {
    super(name, includesDir);

    this.pugOptions = {};

    this.setLibrary(this.config.libraryOverrides.pug);
    this.setPugOptions(this.config.pugOptions);
  }

  setLibrary(lib) {
    this.pugLib = lib || PugLib;
    this.setEngineLib(this.pugLib);
  }

  setPugOptions(options) {
    this.pugOptions = options;
  }

  getPugOptions() {
    let includesDir = super.getIncludesDir();

    return Object.assign(
      {
        basedir: includesDir,
        filename: includesDir
      },
      this.pugOptions || {}
    );
  }

  async compile(str, inputPath) {
    let options = this.getPugOptions();
    if (!inputPath || inputPath === "pug" || inputPath === "md") {
      // do nothing
    } else {
      options.filename = inputPath;
    }

    return this.pugLib.compile(str, options);
  }
}

module.exports = Pug;
