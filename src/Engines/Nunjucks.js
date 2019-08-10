const NunjucksLib = require("nunjucks");
const TemplateEngine = require("./TemplateEngine");
const TemplatePath = require("../TemplatePath");

class Nunjucks extends TemplateEngine {
  constructor(name, includesDir) {
    super(name, includesDir);

    this.setLibrary(this.config.libraryOverrides.njk);
  }

  setLibrary(env) {
    this.njkEnv =
      env ||
      new NunjucksLib.Environment(
        new NunjucksLib.FileSystemLoader([
          super.getIncludesDir(),
          TemplatePath.getWorkingDir()
        ])
      );
    this.setEngineLib(this.njkEnv);

    this.addFilters(this.config.nunjucksFilters);
    this.addFilters(this.config.nunjucksAsyncFilters, true);

    // TODO these all go to the same place (addTag), add warnings for overwrites
    this.addCustomTags(this.config.nunjucksTags);
    this.addAllShortcodes(this.config.nunjucksShortcodes);
    this.addAllPairedShortcodes(this.config.nunjucksPairedShortcodes);
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

  addTag(name, tagFn) {
    let tagObj;
    if (typeof tagFn === "function") {
      tagObj = tagFn(NunjucksLib, this.njkEnv);
    } else {
      throw new Error(
        "Nunjucks.addTag expects a callback function to be passed in: addTag(name, function(nunjucksEngine) {})"
      );
    }

    this.njkEnv.addExtension(name, tagObj);
  }

  addAllShortcodes(shortcodes) {
    for (let name in shortcodes) {
      this.addShortcode(name, shortcodes[name]);
    }
  }

  addAllPairedShortcodes(shortcodes) {
    for (let name in shortcodes) {
      this.addPairedShortcode(name, shortcodes[name]);
    }
  }

  addShortcode(shortcodeName, shortcodeFn) {
    function ShortcodeFunction() {
      this.tags = [shortcodeName];

      this.parse = function(parser, nodes, lexer) {
        let args;
        let tok = parser.nextToken();

        args = parser.parseSignature(true, true);

        // Nunjucks bug with non-paired custom tags bug still exists even
        // though this issue is closed. Works fine for paired.
        // https://github.com/mozilla/nunjucks/issues/158
        if (args.children.length === 0) {
          args.addChild(new nodes.Literal(0, 0, ""));
        }

        parser.advanceAfterBlockEnd(tok.value);

        // return new nodes.CallExtensionAsync(this, "run", args);
        return new nodes.CallExtension(this, "run", args);
      };

      this.run = function(...args) {
        // let callback = args.pop();
        let [context, ...argArray] = args;
        let ret = new NunjucksLib.runtime.SafeString(shortcodeFn(...argArray));
        // callback(null, ret);
        return ret;
      };
    }

    this.njkEnv.addExtension(shortcodeName, new ShortcodeFunction());
  }

  addPairedShortcode(shortcodeName, shortcodeFn) {
    function PairedShortcodeFunction() {
      this.tags = [shortcodeName];

      this.parse = function(parser, nodes, lexer) {
        var tok = parser.nextToken();

        var args = parser.parseSignature(true, true);
        parser.advanceAfterBlockEnd(tok.value);

        var body = parser.parseUntilBlocks("end" + shortcodeName);
        parser.advanceAfterBlockEnd();

        // return new nodes.CallExtensionAsync(this, "run", args, [body]);
        return new nodes.CallExtension(this, "run", args, [body]);
      };

      this.run = function(...args) {
        // let callback = args.pop();
        let body = args.pop();
        let [context, ...argArray] = args;
        let ret = new NunjucksLib.runtime.SafeString(
          shortcodeFn(body(), ...argArray)
        );
        // callback(null, ret);
        return ret;
      };
    }

    this.njkEnv.addExtension(shortcodeName, new PairedShortcodeFunction());
  }

  async compile(str, inputPath) {
    let tmpl;
    if (!inputPath || inputPath === "njk" || inputPath === "md") {
      tmpl = NunjucksLib.compile(str, this.njkEnv);
    } else {
      tmpl = NunjucksLib.compile(str, this.njkEnv, inputPath);
    }
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
