const mdlib = require("markdown-it")({
  html: true,
  langPrefix: "language-"
});
const TemplateEngine = require("./TemplateEngine");
const debug = require("debug")("Eleventy:Markdown");

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
          let preTemplateEngineRender = await fn(data);
          let finishedRender = mdlib.render(preTemplateEngineRender);
          return finishedRender;
        };
      }
    } else {
      return function() {
        // throw away data if preTemplateEngine is falsy
        return mdlib.render(str);
      };
    }
  }
}

module.exports = Markdown;
