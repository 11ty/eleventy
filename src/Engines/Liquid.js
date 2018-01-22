const LiquidLib = require("liquidjs");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");
const debug = require("debug")("Eleventy:Liquid");

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
    // debug( "Adding %o liquid tags", Object.keys(this.config.liquidTags).length);

    this.addFilters(this.config.liquidFilters);
    // debug( "Adding %o liquid filters", Object.keys(this.config.liquidFilters).length);
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
    let tagFn;
    if (typeof tag === "function") {
      tagFn = tag(this.liquidEngine);
    } else {
      throw new Error(
        "Liquid.addTag expects a callback function to be passed in: addTag(name, function(liquidEngine) { return { parse: …, render: … } })"
      );
    }
    this.liquidEngine.registerTag(name, tagFn);
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
