const NunjucksLib = require("nunjucks");
const { TemplatePath } = require("@11ty/eleventy-utils");

const TemplateEngine = require("./TemplateEngine");
const EleventyErrorUtil = require("../EleventyErrorUtil");
const EleventyBaseError = require("../EleventyBaseError");
const eventBus = require("../EventBus");

class EleventyShortcodeError extends EleventyBaseError {}

class Nunjucks extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);
    this.nunjucksEnvironmentOptions =
      this.config.nunjucksEnvironmentOptions || {};

    this.nunjucksPrecompiledTemplates =
      this.config.nunjucksPrecompiledTemplates || {};
    this._usingPrecompiled =
      Object.keys(this.nunjucksPrecompiledTemplates).length > 0;

    this.setLibrary(this.config.libraryOverrides.njk);

    this.cacheable = true;
  }

  _setEnv(override) {
    if (override) {
      this.njkEnv = override;
    } else if (this._usingPrecompiled) {
      // Precompiled templates to avoid eval!
      function NodePrecompiledLoader() {}
      NodePrecompiledLoader.prototype.getSource = (name) => {
        // https://github.com/mozilla/nunjucks/blob/fd500902d7c88672470c87170796de52fc0f791a/nunjucks/src/precompiled-loader.js#L5
        return {
          src: {
            type: "code",
            obj: this.nunjucksPrecompiledTemplates[name],
          },
          // Maybe add this?
          // path,
          // noCache: true
        };
      };

      this.njkEnv = new NunjucksLib.Environment(
        new NodePrecompiledLoader(),
        this.nunjucksEnvironmentOptions
      );
    } else {
      let fsLoader = new NunjucksLib.FileSystemLoader([
        super.getIncludesDir(),
        TemplatePath.getWorkingDir(),
      ]);

      this.njkEnv = new NunjucksLib.Environment(
        fsLoader,
        this.nunjucksEnvironmentOptions
      );
    }

    this.config.events.emit("eleventy.engine.njk", {
      nunjucks: NunjucksLib,
      environment: this.njkEnv,
    });
  }

  setLibrary(override) {
    this._setEnv(override);

    // Correct, but overbroad. Better would be to evict more granularly, but
    // resolution from paths isn't straightforward.
    eventBus.on("eleventy.resourceModified", (path) => {
      this.njkEnv.invalidateCache();
    });

    this.setEngineLib(this.njkEnv);

    this.addFilters(this.config.nunjucksFilters);
    this.addFilters(this.config.nunjucksAsyncFilters, true);

    // TODO these all go to the same place (addTag), add warnings for overwrites
    // TODO(zachleat): variableName should work with quotes or without quotes (same as {% set %})
    this.addPairedShortcode("setAsync", function (content, variableName) {
      this.ctx[variableName] = content;
      return "";
    });

    this.addCustomTags(this.config.nunjucksTags);
    this.addAllShortcodes(this.config.nunjucksShortcodes);
    this.addAllShortcodes(this.config.nunjucksAsyncShortcodes, true);
    this.addAllPairedShortcodes(this.config.nunjucksPairedShortcodes);
    this.addAllPairedShortcodes(
      this.config.nunjucksAsyncPairedShortcodes,
      true
    );
    this.addGlobals(this.config.nunjucksGlobals);
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

  addGlobals(globals) {
    for (let name in globals) {
      this.addGlobal(name, globals[name]);
    }
  }

  addGlobal(name, globalFn) {
    this.njkEnv.addGlobal(name, globalFn);
  }

  addAllShortcodes(shortcodes, isAsync = false) {
    for (let name in shortcodes) {
      this.addShortcode(name, shortcodes[name], isAsync);
    }
  }

  addAllPairedShortcodes(shortcodes, isAsync = false) {
    for (let name in shortcodes) {
      this.addPairedShortcode(name, shortcodes[name], isAsync);
    }
  }

  static _normalizeShortcodeContext(context) {
    let obj = {};
    if (context.ctx && context.ctx.page) {
      obj.ctx = context.ctx;
      obj.page = context.ctx.page;
      obj.eleventy = context.ctx.eleventy;
    }
    return obj;
  }

  _getShortcodeFn(shortcodeName, shortcodeFn, isAsync = false) {
    return function ShortcodeFunction() {
      this.tags = [shortcodeName];

      this.parse = function (parser, nodes) {
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
        if (isAsync) {
          return new nodes.CallExtensionAsync(this, "run", args);
        }
        return new nodes.CallExtension(this, "run", args);
      };

      this.run = function (...args) {
        let resolve;
        if (isAsync) {
          resolve = args.pop();
        }

        let [context, ...argArray] = args;

        if (isAsync) {
          shortcodeFn
            .call(Nunjucks._normalizeShortcodeContext(context), ...argArray)
            .then(function (returnValue) {
              resolve(null, new NunjucksLib.runtime.SafeString(returnValue));
            })
            .catch(function (e) {
              resolve(
                new EleventyShortcodeError(
                  `Error with Nunjucks shortcode \`${shortcodeName}\`${EleventyErrorUtil.convertErrorToString(
                    e
                  )}`
                ),
                null
              );
            });
        } else {
          try {
            return new NunjucksLib.runtime.SafeString(
              shortcodeFn.call(
                Nunjucks._normalizeShortcodeContext(context),
                ...argArray
              )
            );
          } catch (e) {
            throw new EleventyShortcodeError(
              `Error with Nunjucks shortcode \`${shortcodeName}\`${EleventyErrorUtil.convertErrorToString(
                e
              )}`
            );
          }
        }
      };
    };
  }

  _getPairedShortcodeFn(shortcodeName, shortcodeFn, isAsync = false) {
    return function PairedShortcodeFunction() {
      this.tags = [shortcodeName];

      this.parse = function (parser, nodes) {
        var tok = parser.nextToken();

        var args = parser.parseSignature(true, true);
        parser.advanceAfterBlockEnd(tok.value);

        var body = parser.parseUntilBlocks("end" + shortcodeName);
        parser.advanceAfterBlockEnd();

        return new nodes.CallExtensionAsync(this, "run", args, [body]);
      };

      this.run = function (...args) {
        let resolve = args.pop();
        let body = args.pop();
        let [context, ...argArray] = args;

        body(function (e, bodyContent) {
          if (e) {
            resolve(
              new EleventyShortcodeError(
                `Error with Nunjucks paired shortcode \`${shortcodeName}\`${EleventyErrorUtil.convertErrorToString(
                  e
                )}`
              )
            );
          }

          if (isAsync) {
            shortcodeFn
              .call(
                Nunjucks._normalizeShortcodeContext(context),
                bodyContent,
                ...argArray
              )
              .then(function (returnValue) {
                resolve(null, new NunjucksLib.runtime.SafeString(returnValue));
              })
              .catch(function (e) {
                resolve(
                  new EleventyShortcodeError(
                    `Error with Nunjucks paired shortcode \`${shortcodeName}\`${EleventyErrorUtil.convertErrorToString(
                      e
                    )}`
                  ),
                  null
                );
              });
          } else {
            try {
              resolve(
                null,
                new NunjucksLib.runtime.SafeString(
                  shortcodeFn.call(
                    Nunjucks._normalizeShortcodeContext(context),
                    bodyContent,
                    ...argArray
                  )
                )
              );
            } catch (e) {
              resolve(
                new EleventyShortcodeError(
                  `Error with Nunjucks paired shortcode \`${shortcodeName}\`${EleventyErrorUtil.convertErrorToString(
                    e
                  )}`
                )
              );
            }
          }
        });
      };
    };
  }

  addShortcode(shortcodeName, shortcodeFn, isAsync = false) {
    let fn = this._getShortcodeFn(shortcodeName, shortcodeFn, isAsync);
    this.njkEnv.addExtension(shortcodeName, new fn());
  }

  addPairedShortcode(shortcodeName, shortcodeFn, isAsync = false) {
    let fn = this._getPairedShortcodeFn(shortcodeName, shortcodeFn, isAsync);
    this.njkEnv.addExtension(shortcodeName, new fn());
  }

  permalinkNeedsCompilation(str) {
    return this.needsCompilation(str);
  }

  needsCompilation(str) {
    // Defend against syntax customisations:
    //    https://mozilla.github.io/nunjucks/api.html#customizing-syntax
    let optsTags = this.njkEnv.opts.tags || {};
    let blockStart = optsTags.blockStart || "{%";
    let variableStart = optsTags.variableStart || "{{";
    let commentStart = optsTags.variableStart || "{#";

    return (
      str.indexOf(blockStart) !== -1 ||
      str.indexOf(variableStart) !== -1 ||
      str.indexOf(commentStart) !== -1
    );
  }

  _getParseExtensions() {
    if (this._parseExtensions) {
      return this._parseExtensions;
    }

    // add extensions so the parser knows about our custom tags/blocks
    let ext = [];
    for (let name in this.config.nunjucksTags) {
      let fn = this._getShortcodeFn(name, () => {});
      ext.push(new fn());
    }
    for (let name in this.config.nunjucksShortcodes) {
      let fn = this._getShortcodeFn(name, () => {});
      ext.push(new fn());
    }
    for (let name in this.config.nunjucksAsyncShortcodes) {
      let fn = this._getShortcodeFn(name, () => {}, true);
      ext.push(new fn());
    }
    for (let name in this.config.nunjucksPairedShortcodes) {
      let fn = this._getPairedShortcodeFn(name, () => {});
      ext.push(new fn());
    }
    for (let name in this.config.nunjucksAsyncPairedShortcodes) {
      let fn = this._getPairedShortcodeFn(name, () => {}, true);
      ext.push(new fn());
    }

    this._parseExtensions = ext;
    return ext;
  }

  /* Outputs an Array of lodash.get selectors */
  parseForSymbols(str) {
    const { parser, nodes } = NunjucksLib;
    let obj = parser.parse(str, this._getParseExtensions());
    let linesplit = str.split("\n");
    let values = obj.findAll(nodes.Value);
    let symbols = obj.findAll(nodes.Symbol).map((entry) => {
      let name = [entry.value];
      let nestedIndex = -1;
      for (let val of values) {
        if (nestedIndex > -1) {
          /* deep.object.syntax */
          if (linesplit[val.lineno].charAt(nestedIndex) === ".") {
            name.push(val.value);
            nestedIndex += val.value.length + 1;
          } else {
            nestedIndex = -1;
          }
        } else if (
          val.lineno === entry.lineno &&
          val.colno === entry.colno &&
          val.value === entry.value
        ) {
          nestedIndex = entry.colno + entry.value.length;
        }
      }
      return name.join(".");
    });

    return Array.from(new Set(symbols));
  }

  async compile(str, inputPath) {
    let tmpl;

    if (this._usingPrecompiled) {
      tmpl = this.njkEnv.getTemplate(str, true);
    } else if (!inputPath || inputPath === "njk" || inputPath === "md") {
      tmpl = new NunjucksLib.Template(str, this.njkEnv, null, true);
    } else {
      tmpl = new NunjucksLib.Template(str, this.njkEnv, inputPath, true);
    }

    return async function (data) {
      return new Promise(function (resolve, reject) {
        tmpl.render(data, function (err, res) {
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
