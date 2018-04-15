const LiquidLib = require("liquidjs");
const TemplateEngine = require("./TemplateEngine");
const lodashMerge = require("lodash.merge");
const config = require("../Config");
const debug = require("debug")("Eleventy:Liquid");

class Liquid extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.config = config.getConfig();
    this.liquidOptions = {};

    this.setLibrary(this.config.libraryOverrides.liquid);
    this.setLiquidOptions(this.config.liquidOptions);
  }

  setLibrary(lib) {
    this.liquidLibOverride = lib;

    // warning, the include syntax supported here does not exactly match what Jekyll uses.
    this.liquidLib = lib || LiquidLib(this.getLiquidOptions());
    this.setEngineLib(this.liquidLib);

    this.addTags(this.config.liquidTags);
    this.addFilters(this.config.liquidFilters);
  }

  setLiquidOptions(options) {
    this.liquidOptions = options;

    this.setLibrary(this.liquidLibOverride);
  }

  getLiquidOptions() {
    let defaults = {
      root: [super.getInputDir()],
      extname: ".liquid",
      dynamicPartials: false
    };

    let options = lodashMerge(defaults, this.liquidOptions || {});
    // debug("Liquid constructor options: %o", options);

    return options;
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
      tagObj = tag(this.liquidLib);
    } else {
      throw new Error(
        "Liquid.addTag expects a callback function to be passed in: addTag(name, function(liquidEngine) { return { parse: …, render: … } })"
      );
    }
    this.liquidLib.registerTag(name, tagObj);
  }

  addFilter(name, filter) {
    this.liquidLib.registerFilter(name, filter);
  }

  async compile(str) {
    let engine = this.liquidLib;
    let tmpl = await engine.parse(str);
    return async function(data) {
      return engine.render(tmpl, data);
    };
  }
}

module.exports = Liquid;
