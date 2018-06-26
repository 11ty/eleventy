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
    this.addCustomTags(this.config.nunjucksTags);
    this.setEngineLib(this.njkEnv);
  }

  addFilters(helpers, isAsync) {
    for (let name in helpers) {
      this.njkEnv.addFilter(name, helpers[name], isAsync);
    }
  }

  addCustomTags(tags) {
    for (let name in tags) {
      this.addTag(name, tags[name]);
    }
  }

  addTag(name, tag) {
    let tagObj;
    if (typeof tag === "function") {
      tagObj = tag(NunjucksLib, this.njkEnv);
    } else {
      throw new Error(
        "Nunjucks.addTag expects a callback function to be passed in: addTag(name, function(nunjucksEngine) {})"
      );
    }

    this.njkEnv.addExtension(name, tagObj);
  }

  async compile(str, inputPath) {
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
