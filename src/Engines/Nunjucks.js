const NunjucksLib = require("nunjucks");
const TemplateEngine = require("./TemplateEngine");
const slug = require("slug-rfc");

class Nunjucks extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.njkEnv = new NunjucksLib.Environment(
      new NunjucksLib.FileSystemLoader(super.getInputDir())
    );

    this.njkEnv.addFilter("slug", function(str) {
      return slug(str, {
        lower: true
      });
    });
  }

  async compile(str) {
    let tmpl = NunjucksLib.compile(str, this.njkEnv);
    return function(data) {
      return tmpl.render(data);
    };
  }
}

module.exports = Nunjucks;
