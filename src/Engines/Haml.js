const HamlLib = require("hamljs");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");

class Haml extends TemplateEngine {
  constructor(name, includesDir) {
    super(name, includesDir);

    this.setLibrary(this.config.libraryOverrides.haml);
  }

  setLibrary(lib) {
    this.hamlLib = lib || HamlLib;
    this.setEngineLib(lib);
  }

  async compile(str, inputPath) {
    return this.hamlLib.compile(str);
  }
}

module.exports = Haml;
