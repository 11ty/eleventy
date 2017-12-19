const slug = require("slug-rfc");
const NunjucksLib = require("nunjucks");
const TemplateEngine = require("./TemplateEngine");
const TemplateConfig = require("../TemplateConfig");

let templateCfg = new TemplateConfig(require("../../config.json"));
let cfg = templateCfg.getConfig();

class Nunjucks extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.njkEnv = new NunjucksLib.Environment(
      new NunjucksLib.FileSystemLoader(super.getInputDir())
    );

    // TODO move into cfg
    this.njkEnv.addFilter("slug", function(str) {
      return slug(str, {
        lower: true
      });
    });

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
