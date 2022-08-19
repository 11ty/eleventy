import MustacheLib from "mustache";
import TemplateEngine from "./TemplateEngine.js";

export default class Mustache extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);

    this.setLibrary(this.config.libraryOverrides.mustache);
  }

  setLibrary(lib) {
    this.mustacheLib = lib || MustacheLib;
    this.setEngineLib(this.mustacheLib);
  }

  async compile(str) {
    let partials = super.getPartials();

    return function (data) {
      return this.render(str, data, partials).trim();
    }.bind(this.mustacheLib);
  }
}
