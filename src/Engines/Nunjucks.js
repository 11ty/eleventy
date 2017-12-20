const slug = require("slug-rfc");
const NunjucksLib = require("nunjucks");
const TemplateEngine = require("./TemplateEngine");
const TemplateConfig = require("../TemplateConfig");

let cfg = TemplateConfig.getDefaultConfig();

class Nunjucks extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.njkEnv = new NunjucksLib.Environment(
      new NunjucksLib.FileSystemLoader(super.getInputDir())
    );

    this.addFilters(cfg.nunjucksFilters);
  }

  addFilters(helpers) {
    for (let name in helpers) {
      this.njkEnv.addFilter(name, helpers[name]);
    }
  }

  async compile(str) {
    let tmpl = NunjucksLib.compile(str, this.njkEnv);
    return function(data) {
      return tmpl.render(data);
    };
  }
}

module.exports = Nunjucks;
