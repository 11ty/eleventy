const TemplateEngine = require("./TemplateEngine");

class Html extends TemplateEngine {
  async compile(str, preTemplateEngine) {
    if (preTemplateEngine) {
      let engine = TemplateEngine.getEngine(
        preTemplateEngine,
        super.getInputDir()
      );
      let fn = await engine.compile(str);

      return async function(data) {
        return fn(data);
      };
    } else {
      return function(data) {
        // do nothing with data if parseHtmlWith is falsy
        return str;
      };
    }
  }
}

module.exports = Html;
