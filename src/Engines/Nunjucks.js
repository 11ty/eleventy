const NunjucksLib = require("nunjucks");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");

class Nunjucks extends TemplateEngine {
  constructor(name, inputDir) {
    super(name, inputDir);

    this.config = config.getConfig();
    this.setLibrary(this.config.libraryOverrides.njk);
  }

  setLibrary(env) {
    this.njkEnv =
      env ||
      new NunjucksLib.Environment(
        new NunjucksLib.FileSystemLoader(super.getInputDir())
      );

    this.addFilters(this.config.nunjucksFilters);
    this.addFilters(this.config.nunjucksAsyncFilters, true);
    this.setEngineLib(this.njkEnv);
  }

  addFilters(helpers, isAsync) {
    for (let name in helpers) {
      this.njkEnv.addFilter(name, helpers[name], isAsync);
    }
  }

  async compile(str) {
    let tmpl = NunjucksLib.compile(str, this.njkEnv);
    return async function(data) {
      return new Promise(function(resolve, reject) {
        tmpl.render(data, function(err, res) {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      });
    };
  }
}

module.exports = Nunjucks;
