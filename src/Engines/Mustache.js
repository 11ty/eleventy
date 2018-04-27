const MustacheLib = require("mustache");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");

class Mustache extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.config = config.getConfig();
    this.setLibrary(this.config.libraryOverrides.mustache);
  }

  setLibrary(lib) {
    this.mustacheLib = lib || MustacheLib;
    this.setEngineLib(this.mustacheLib);
  }

  async compile(str, inputPath) {
    let partials = super.getPartials();

    return function(data) {
      return this.render(str, data, partials).trim();
    }.bind(this.mustacheLib);
  }
}

module.exports = Mustache;
