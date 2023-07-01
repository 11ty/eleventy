const HandlebarsLib = require("handlebars");
const TemplateEngine = require("./TemplateEngine");

class Handlebars extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);

    this.setLibrary(this.config.libraryOverrides.hbs);
  }

  setLibrary(lib) {
    this.handlebarsLib = lib || HandlebarsLib;
    this.setEngineLib(this.handlebarsLib);

    // TODO these all go to the same place (addHelper), add warnings for overwrites
    this.addHelpers(this.config.handlebarsHelpers);
    this.addShortcodes(this.config.handlebarsShortcodes);
    this.addPairedShortcodes(this.config.handlebarsPairedShortcodes);
  }

  addHelper(name, callback) {
    this.handlebarsLib.registerHelper(name, callback);
  }

  addHelpers(helpers) {
    for (let name in helpers) {
      // We don’t need to wrap helpers for `page` or `eleventy`, this is provided for free by Handlebars
      this.addHelper(name, helpers[name]);
    }
  }

  addShortcodes(shortcodes) {
    for (let name in shortcodes) {
      this.addHelper(name, shortcodes[name]);
    }
  }

  addPairedShortcodes(shortcodes) {
    for (let name in shortcodes) {
      let callback = shortcodes[name];
      this.addHelper(name, function (...args) {
        let options = args[args.length - 1];
        let content = "";
        if (options && options.fn) {
          content = options.fn(this);
        }

        return callback.call(this, content, ...args);
      });
    }
  }

  /**
   * @override
   */
  async cachePartialFiles() {
    let ret = await super.cachePartialFiles();
    this.handlebarsLib.registerPartial(ret.partials);
    return ret;
  }

  async compile(str) {
    // Ensure partials are cached and registered.
    await this.getPartials();

    let fn = this.handlebarsLib.compile(str);
    return function (data) {
      return fn(data);
    };
  }
}

module.exports = Handlebars;
