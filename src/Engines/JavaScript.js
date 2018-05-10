const TemplateEngine = require("./TemplateEngine");
const EleventyError = require("../EleventyError");

class JavaScript extends TemplateEngine {
  async compile(str, inputPath) {
    const cls = require(inputPath);
    let inst = new cls(inputPath);
    return inst.compile();
  }
}

module.exports = JavaScript;
