const LiquidLib = require("liquidjs");
const TemplateEngine = require("./TemplateEngine");

class Liquid extends TemplateEngine {
  async compile(str) {
    // warning, the include syntax supported here does not match what jekyll uses.
    let engine = LiquidLib({
      root: [super.getInputDir()],
      extname: ".liquid",
      dynamicPartials: false
    });

    let tmpl = await engine.parse(str);
    return async function(data) {
      return engine.render(tmpl, data);
    };
  }
}

module.exports = Liquid;
