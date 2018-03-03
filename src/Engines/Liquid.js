const LiquidLib = require("liquidjs");
const TemplateEngine = require("./TemplateEngine");
const lodashMerge = require("lodash.merge");
const config = require("../Config");
const debug = require("debug")("Eleventy:Liquid");

class Liquid extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.config = config.getConfig();
    this.liquidOptions = this.config.liquidOptions;

    // warning, the include syntax supported here does not match what jekyll uses.
    this.liquidEngine = LiquidLib(this.getLiquidOptions());

    this.addTags(this.config.liquidTags);
    // debug( "Adding %o liquid tags", Object.keys(this.config.liquidTags).length);

    this.addFilters(this.config.liquidFilters);
    // debug( "Adding %o liquid filters", Object.keys(this.config.liquidFilters).length);
  }

  setLiquidOptions(options) {
    this.liquidOptions = options;

    this.liquidEngine = LiquidLib(this.getLiquidOptions());
  }

  getLiquidOptions() {
    let defaults = {
      root: [super.getInputDir()],
      extname: ".liquid",
      dynamicPartials: false
    };

    return lodashMerge(defaults, this.liquidOptions || {});
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
    let tagObj;
    if (typeof tag === "function") {
      tagObj = tag(this.liquidEngine);
    } else {
      throw new Error(
        "Liquid.addTag expects a callback function to be passed in: addTag(name, function(liquidEngine) { return { parse: …, render: … } })"
      );
    }
    this.liquidEngine.registerTag(name, tagObj);
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
