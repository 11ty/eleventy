const mdlib = require("markdown-it")();
const TemplateEngine = require("./TemplateEngine");

class Markdown extends TemplateEngine {
  async compile(str, preTemplateEngine, bypassMarkdown) {
    if (preTemplateEngine) {
      let engine = TemplateEngine.getEngine(
        preTemplateEngine,
        super.getInputDir()
      );
      let fn = await engine.compile(str);

      if (bypassMarkdown) {
        return async function(data) {
          return fn(data);
        };
      } else {
        return async function(data) {
          return mdlib.render(await fn(data));
        };
      }
    } else {
      return function(data) {
        // throw away data if preTemplateEngine is falsy
        return mdlib.render(str);
      };
    }
  }
}

module.exports = Markdown;
