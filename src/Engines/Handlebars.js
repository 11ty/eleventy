const HandlebarsLib = require("handlebars");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");

class Handlebars extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.config = config.getConfig();
    this.setLibrary(this.config.libraryOverrides.hbs);
  }

  setLibrary(lib) {
    this.handlebarsLib = lib || HandlebarsLib;
    this.setEngineLib(this.handlebarsLib);

    let partials = super.getPartials();
    for (let name in partials) {
      this.handlebarsLib.registerPartial(name, partials[name]);
    }

    this.addHelpers(this.config.handlebarsHelpers);
  }

  addHelpers(helpers) {
    for (let name in helpers) {
      this.handlebarsLib.registerHelper(name, helpers[name]);
    }
  }

  async compile(str) {
    let fn = this.handlebarsLib.compile(str);
    return function(data) {
      return fn(data);
    };
  }
}

module.exports = Handlebars;
