import HamlLib from "hamljs";
import TemplateEngine from "./TemplateEngine.js";

export default class Haml extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);

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
