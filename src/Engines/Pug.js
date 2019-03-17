const PugLib = require("pug");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");

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

  async compile(str) {
    let options = this.getPugOptions();

    return this.pugLib.compile(str, options);
  }
}

module.exports = Pug;
