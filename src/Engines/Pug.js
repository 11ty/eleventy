const PugLib = require("pug");
const TemplateEngine = require("./TemplateEngine");

class Pug extends TemplateEngine {
  async compile(str) {
    return PugLib.compile(str, {
      basedir: super.getInputDir()
    });
  }
}

module.exports = Pug;
