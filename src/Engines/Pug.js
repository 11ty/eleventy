const PugLib = require("pug");
const TemplateEngine = require("./TemplateEngine");
const lodashMerge = require("lodash.merge");
const config = require("../Config");

class Pug extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.config = config.getConfig();
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
    let inputDir = super.getInputDir();

    return lodashMerge(
      {
        basedir: inputDir,
        filename: inputDir
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
