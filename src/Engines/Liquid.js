const moo = require("moo");
const liquidLib = require("liquidjs");
const { TemplatePath } = require("@11ty/eleventy-utils");

const TemplateEngine = require("./TemplateEngine");
// const debug = require("debug")("Eleventy:Liquid");

class Liquid extends TemplateEngine {
  static argumentLexerOptions = {
    number: /[0-9]+\.*[0-9]*/,
    doubleQuoteString: /"(?:\\["\\]|[^\n"\\])*"/,
    singleQuoteString: /'(?:\\['\\]|[^\n'\\])*'/,
    keyword: /[a-zA-Z0-9.\-_]+/,
    "ignore:whitespace": /[, \t]+/, // includes comma separator
  };

  constructor(name, dirs, config) {
    super(name, dirs, config);

    this.liquidOptions = this.config.liquidOptions || {};

    this.setLibrary(this.config.libraryOverrides.liquid);

    this.argLexer = moo.compile(Liquid.argumentLexerOptions);
    this.cacheable = true;
  }

  setLibrary(override) {
    // warning, the include syntax supported here does not exactly match what Jekyll uses.
    this.liquidLib = override || new liquidLib.Liquid(this.getLiquidOptions());
    this.setEngineLib(this.liquidLib);

    this.addFilters(this.config.liquidFilters);

    // TODO these all go to the same place (addTag), add warnings for overwrites
    this.addCustomTags(this.config.liquidTags);
    this.addAllShortcodes(this.config.liquidShortcodes);
    this.addAllPairedShortcodes(this.config.liquidPairedShortcodes);
  }

  getLiquidOptions() {
    let defaults = {
      root: [this.dirs.includes, this.dirs.input], // supplemented in compile with inputPath below
      extname: ".liquid",
      strictFilters: true,
      // TODO?
      // cache: true,
    };

    let options = Object.assign(defaults, this.liquidOptions || {});
    // debug("Liquid constructor options: %o", options);

    return options;
  }

  static wrapFilter(fn) {
    return function (...args) {
      if (this.context && "get" in this.context) {
        this.page = this.context.get(["page"]);
        this.eleventy = this.context.get(["eleventy"]);
      }

      return fn.call(this, ...args);
    };
  }

  // Shortcodes
  static normalizeScope(context) {
    let obj = {};
    if (context) {
      obj.ctx = context;
      obj.page = context.get(["page"]);
      obj.eleventy = context.get(["eleventy"]);
    }
    return obj;
  }

  addCustomTags(tags) {
    for (let name in tags) {
      this.addTag(name, tags[name]);
    }
  }

  addFilters(filters) {
    for (let name in filters) {
      this.addFilter(name, filters[name]);
    }
  }

  addFilter(name, filter) {
    this.liquidLib.registerFilter(name, Liquid.wrapFilter(filter));
  }

  addTag(name, tagFn) {
    let tagObj;
    if (typeof tagFn === "function") {
      tagObj = tagFn(this.liquidLib);
    } else {
      throw new Error(
        "Liquid.addTag expects a callback function to be passed in: addTag(name, function(liquidEngine) { return { parse: …, render: … } })"
      );
    }
    this.liquidLib.registerTag(name, tagObj);
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

  static parseArguments(lexer, str) {
    let argArray = [];

    if (!lexer) {
      lexer = moo.compile(Liquid.argumentLexerOptions);
    }

    if (typeof str === "string") {
      lexer.reset(str);

      let arg = lexer.next();
      while (arg) {
        /*{
          type: 'doubleQuoteString',
          value: '"test 2"',
          text: '"test 2"',
          toString: [Function: tokenToString],
          offset: 0,
          lineBreaks: 0,
          line: 1,
          col: 1 }*/
        if (arg.type.indexOf("ignore:") === -1) {
          // Push the promise into an array instead of awaiting it here.
          // This forces the promises to run in order with the correct scope value for each arg.
          // Otherwise they run out of order and can lead to undefined values for arguments in layout template shortcodes.
          // console.log( arg.value, scope, engine );
          argArray.push(arg.value);
        }
        arg = lexer.next();
      }
    }

    return argArray;
  }

  addShortcode(shortcodeName, shortcodeFn) {
    let _t = this;
    this.addTag(shortcodeName, function (liquidEngine) {
      return {
        parse(tagToken) {
          this.name = tagToken.name;
          this.args = tagToken.args;
        },
        render: function* (ctx) {
          let rawArgs = Liquid.parseArguments(_t.argLexer, this.args);
          let argArray = [];
          let contextScope = ctx.getAll();
          for (let arg of rawArgs) {
            let b = yield liquidEngine.evalValue(arg, contextScope);
            argArray.push(b);
          }

          let ret = yield shortcodeFn.call(
            Liquid.normalizeScope(ctx),
            ...argArray
          );
          return ret;
        },
      };
    });
  }

  addPairedShortcode(shortcodeName, shortcodeFn) {
    let _t = this;
    this.addTag(shortcodeName, function (liquidEngine) {
      return {
        parse(tagToken, remainTokens) {
          this.name = tagToken.name;
          this.args = tagToken.args;
          this.templates = [];

          var stream = liquidEngine.parser
            .parseStream(remainTokens)
            .on("template", (tpl) => this.templates.push(tpl))
            .on("tag:end" + shortcodeName, () => stream.stop())
            .on("end", () => {
              throw new Error(`tag ${tagToken.raw} not closed`);
            });

          stream.start();
        },
        render: function* (ctx, emitter) {
          let rawArgs = Liquid.parseArguments(_t.argLexer, this.args);
          let argArray = [];
          let contextScope = ctx.getAll();
          for (let arg of rawArgs) {
            let b = yield liquidEngine.evalValue(arg, contextScope);
            argArray.push(b);
          }

          const html = yield liquidEngine.renderer.renderTemplates(
            this.templates,
            ctx
          );

          let ret = yield shortcodeFn.call(
            Liquid.normalizeScope(ctx),
            html,
            ...argArray
          );
          // emitter.write(ret);
          return ret;
        },
      };
    });
  }

  parseForSymbols(str) {
    let tokenizer = new liquidLib.Tokenizer(str);
    let tokens = tokenizer.readTopLevelTokens();
    let symbols = tokens
      .filter((token) => token.kind === liquidLib.TokenKind.Output)
      .map((token) => {
        // manually remove filters 😅
        return token.content.split("|").map((entry) => entry.trim())[0];
      });
    return symbols;
  }

  // Don’t return a boolean if permalink is a function (see TemplateContent->renderPermalink)
  permalinkNeedsCompilation(str) {
    if (typeof str === "string") {
      return this.needsCompilation(str);
    }
  }

  needsCompilation(str) {
    let options = this.liquidLib.options;

    return (
      str.indexOf(options.tagDelimiterLeft) !== -1 ||
      str.indexOf(options.outputDelimiterLeft) !== -1
    );
  }

  async compile(str, inputPath) {
    let engine = this.liquidLib;
    let tmplReady = engine.parse(str, inputPath);

    // Required for relative includes
    let options = {};
    if (!inputPath || inputPath === "liquid" || inputPath === "md") {
      // do nothing
    } else {
      options.root = [TemplatePath.getDirFromFilePath(inputPath)];
    }

    return async function (data) {
      let tmpl = await tmplReady;

      return engine.render(tmpl, data, options);
    };
  }
}

module.exports = Liquid;
