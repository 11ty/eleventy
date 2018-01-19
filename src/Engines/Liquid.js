const LiquidLib = require("liquidjs");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");

class Liquid extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.config = config.getConfig();

    // warning, the include syntax supported here does not match what jekyll uses.
    this.liquidEngine = LiquidLib({
      root: [super.getInputDir()],
      extname: ".liquid",
      dynamicPartials: false
    });

    this.addTags(this.config.liquidTags);
    this.addFilters(this.config.liquidFilters);
  }

  addTags(tags) {
    for (let name in tags) {
      this.addTag(name, tags[name]);
    }
  }

  addFilters(filters) {
    for (let name in filters) {
      this.addFilter(name, filters[name]);
    }
  }

  addTag(name, tag) {
    this.liquidEngine.registerTag(name, tag);
  }

  addFilter(name, filter) {
    this.liquidEngine.registerFilter(name, filter);
  }

  async compile(str) {
    let engine = this.liquidEngine;
    let tmpl = await engine.parse(str);
    return async function(data) {
      return engine.render(tmpl, data);
    };
  }
}

module.exports = Liquid;
