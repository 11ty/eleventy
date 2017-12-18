const ejsLib = require("ejs");
const TemplateEngine = require("./TemplateEngine");

class Ejs extends TemplateEngine {
  async compile(str) {
    let fn = ejsLib.compile(str, {
      root: "./" + super.getInputDir(),
      compileDebug: true
    });

    return function(data) {
      return fn(data);
    };
  }
}

module.exports = Ejs;
