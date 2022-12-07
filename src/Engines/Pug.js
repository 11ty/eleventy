const PugLib = require("pug");
const TemplateEngine = require("./TemplateEngine");

class Pug extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);

    this.pugOptions = this.config.pugOptions || {};

    this.setLibrary(this.config.libraryOverrides.pug);
  }

  setLibrary(override) {
    this.pugLib = override || PugLib;
    this.setEngineLib(this.pugLib);
  }

  getPugOptions() {
    let includesDir = super.getIncludesDir();

    return Object.assign(
      {
        basedir: includesDir,
        filename: includesDir,
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
