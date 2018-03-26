const HamlLib = require("hamljs");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");

class Haml extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.config = config.getConfig();
    this.setLibrary(this.config.libraryOverrides.haml);
  }

  setLibrary(lib) {
    this.hamlLib = lib || HamlLib;
    this.setEngineLib(lib);
  }

  async compile(str) {
    return this.hamlLib.compile(str);
  }
}

module.exports = Haml;
