const TemplateEngine = require("./TemplateEngine");

class Html extends TemplateEngine {
  async compile(str, inputPath, preTemplateEngine) {
    if (preTemplateEngine) {
      let engine = this.engineManager.getEngine(
        preTemplateEngine,
        super.getIncludesDir(),
        this.extensionMap
      );
      let fn = await engine.compile(str, inputPath);

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
