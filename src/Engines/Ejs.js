const ejsLib = require("ejs");
const TemplateEngine = require("./TemplateEngine");

class Ejs extends TemplateEngine {
  constructor(name, includesDir) {
    super(name, includesDir);

    this.ejsOptions = {};

    this.setLibrary(this.config.libraryOverrides.ejs);
    this.setEjsOptions(this.config.ejsOptions);
  }

  setLibrary(lib) {
    this.ejsLib = lib || ejsLib;
    this.setEngineLib(this.ejsLib);
  }

  getEngine() {
    return this.ejsLib;
  }

  setEjsOptions(options) {
    this.ejsOptions = options;
  }

  getEjsOptions() {
    let includesDir = super.getIncludesDir();

    return Object.assign(
      {
        root: "./" + includesDir,
        compileDebug: true,
        filename: "./" + includesDir
      },
      this.ejsOptions || {}
    );
  }

  getEjsFunctions(data) {
    let fns = {};
    let configFns = this.config.ejsFunctions;

    for (let key in configFns) {
        // Attaching the ejs lib and the ejs options to the data
        Object.assign(data, {ejsEngine: this.ejsLib, ejsOptions: this.getEjsOptions()});
        fns[key] = configFns[key].bind(data);
    }
    return fns;
  }

  async compile(str, inputPath) {
    let options = this.getEjsOptions();

    if (inputPath && inputPath !== "ejs" && inputPath !== "md") {
      options.filename = inputPath;
    }

    options.async = true;

    let fn = await this.ejsLib.compile(str, options);

    return data => {
      Object.assign(data, this.getEjsFunctions(data));
      return fn(data);
    };
  }
}

module.exports = Ejs;
