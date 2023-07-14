const TemplateEngine = require("./TemplateEngine");

class Html extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);
    this.cacheable = true;
  }

  async compile(str, inputPath, preTemplateEngine) {
    if (preTemplateEngine) {
      let engine = this.engineManager.getEngine(
        preTemplateEngine,
        this.dirs,
        this.extensionMap
      );
      let fnReady = engine.compile(str, inputPath);

      return async function (data) {
        let fn = await fnReady;

        return fn(data);
      };
    } else {
      return function () {
        // do nothing with data if parseHtmlWith is falsy
        return str;
      };
    }
  }
}

module.exports = Html;
