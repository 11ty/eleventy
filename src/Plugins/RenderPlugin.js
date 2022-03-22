const fs = require("fs");
const fsp = fs.promises;
const isPlainObject = require("../Util/IsPlainObject");
const { TemplatePath } = require("@11ty/eleventy-utils");

// TODO add a first-class Markdown component to expose this using Markdown-only syntax (will need to be synchronous for markdown-it)

const TemplateRender = require("../TemplateRender");
const TemplateConfig = require("../TemplateConfig");
const Liquid = require("../Engines/Liquid");

function normalizeDirectories(dir = {}) {
  return Object.assign(
    {
      input: ".",
    },
    dir
  );
}

async function render(
  content,
  templateLang = "html",
  normalizedDirs = {},
  { templateConfig, extensionMap }
) {
  if (!templateConfig) {
    templateConfig = new TemplateConfig();
  }

  let tr = new TemplateRender(
    templateLang,
    normalizedDirs.input,
    templateConfig
  );
  tr.extensionMap = extensionMap;
  tr.setEngineOverride(templateLang);

  // TODO tie this to the class, not the extension
  if (tr.engine.name === "11ty.js" || tr.engine.name === "11ty.cjs") {
    throw new Error(
      "11ty.js is not yet supported as a template engine for `renderTemplate`. Use `renderFile` instead!"
    );
  }

  return tr.getCompiledTemplate(content);
}

// No templateLang default, it should infer from the inputPath.
async function renderFile(
  inputPath,
  templateLang,
  normalizedDirs = {},
  { templateConfig, extensionMap }
) {
  if (!inputPath) {
    throw new Error(
      "Missing file path argument passed to the `renderFile` shortcode."
    );
  }

  if (
    !fs.existsSync(TemplatePath.normalizeOperatingSystemFilePath(inputPath))
  ) {
    throw new Error(
      "Could not find render plugin file for the `renderFile` shortcode, looking for: " +
        inputPath
    );
  }

  if (!templateConfig) {
    templateConfig = new TemplateConfig();
  }

  let tr = new TemplateRender(inputPath, normalizedDirs.input, templateConfig);
  tr.extensionMap = extensionMap;
  if (templateLang) {
    tr.setEngineOverride(templateLang);
  }

  if (!tr.engine.needsToReadFileContents()) {
    return tr.getCompiledTemplate(null);
  }

  // TODO we could make this work with full templates (with front matter?)
  let content = await fsp.readFile(inputPath, "utf8");
  return tr.getCompiledTemplate(content);
}

function EleventyPlugin(eleventyConfig, options = {}) {
  function liquidTemplateTag(liquidEngine, tagName) {
    // via https://github.com/harttle/liquidjs/blob/b5a22fa0910c708fe7881ef170ed44d3594e18f3/src/builtin/tags/raw.ts
    return {
      parse: function (tagToken, remainTokens) {
        this.name = tagToken.name;
        this.args = tagToken.args;
        this.tokens = [];

        var stream = liquidEngine.parser
          .parseStream(remainTokens)
          .on("token", (token) => {
            if (token.name === "end" + tagName) stream.stop();
            else this.tokens.push(token);
          })
          .on("end", () => {
            throw new Error(`tag ${tagToken.getText()} not closed`);
          });

        stream.start();
      },
      render: async function (ctx) {
        let normalizedContext = {};
        if (ctx) {
          normalizedContext.page = ctx.get(["page"]);
        }

        let argArray = await Liquid.parseArguments(
          null,
          this.args,
          ctx,
          this.liquid
        );

        let body = this.tokens.map((token) => token.getText()).join("");

        return renderStringShortcodeFn.call(
          normalizedContext,
          body,
          ...argArray
        );
      },
    };
  }

  // TODO I don’t think this works with whitespace control, e.g. {%- endrenderTemplate %}
  function nunjucksTemplateTag(NunjucksLib, tagName) {
    return new (function () {
      this.tags = [tagName];

      this.parse = function (parser, nodes) {
        var tok = parser.nextToken();

        var args = parser.parseSignature(true, true);
        const begun = parser.advanceAfterBlockEnd(tok.value);

        // This code was ripped from the Nunjucks parser for `raw`
        // https://github.com/mozilla/nunjucks/blob/fd500902d7c88672470c87170796de52fc0f791a/nunjucks/src/parser.js#L655
        const endTagName = "end" + tagName;
        // Look for upcoming raw blocks (ignore all other kinds of blocks)
        const rawBlockRegex = new RegExp(
          "([\\s\\S]*?){%\\s*(" + tagName + "|" + endTagName + ")\\s*(?=%})%}"
        );
        let rawLevel = 1;
        let str = "";
        let matches = null;

        // Exit when there's nothing to match
        // or when we've found the matching "endraw" block
        while (
          (matches = parser.tokens._extractRegex(rawBlockRegex)) &&
          rawLevel > 0
        ) {
          const all = matches[0];
          const pre = matches[1];
          const blockName = matches[2];

          // Adjust rawlevel
          if (blockName === tagName) {
            rawLevel += 1;
          } else if (blockName === endTagName) {
            rawLevel -= 1;
          }

          // Add to str
          if (rawLevel === 0) {
            // We want to exclude the last "endraw"
            str += pre;
            // Move tokenizer to beginning of endraw block
            parser.tokens.backN(all.length - pre.length);
          } else {
            str += all;
          }
        }

        let body = new nodes.Output(begun.lineno, begun.colno, [
          new nodes.TemplateData(begun.lineno, begun.colno, str),
        ]);
        return new nodes.CallExtensionAsync(this, "run", args, [body]);
      };

      this.run = function (...args) {
        let resolve = args.pop();
        let body = args.pop();
        let [context, ...argArray] = args;

        let normalizedContext = {};
        if (context.ctx && context.ctx.page) {
          normalizedContext.ctx = context.ctx;
          normalizedContext.page = context.ctx.page;
        }

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

          Promise.resolve(
            renderStringShortcodeFn.call(
              normalizedContext,
              bodyContent,
              ...argArray
            )
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
        });
      };
    })();
  }

  let opts = Object.assign(
    {
      tagName: "renderTemplate",
      tagNameFile: "renderFile",
    },
    options
  );

  // This will only work on 1.0.0-beta.5+ but is only necessary if you want to reuse your config inside of template shortcodes.
  // Just rendering raw templates (without filters, shortcodes, etc. from your config) will work fine on old versions.
  let templateConfig;
  eleventyConfig.on("eleventy.config", (cfg) => {
    templateConfig = cfg;
  });

  let extensionMap;
  eleventyConfig.on("eleventy.extensionmap", (map) => {
    extensionMap = map;
  });

  async function renderStringShortcodeFn(content, templateLang, data = {}) {
    let fn = await render.call(
      this,
      content,
      templateLang,
      normalizeDirectories(eleventyConfig.dir),
      {
        templateConfig,
        extensionMap,
      }
    );

    if (fn === undefined) {
      return;
    } else if (typeof fn !== "function") {
      throw new Error(
        `The \`compile\` function did not return a function. Received ${fn}`
      );
    }

    // if the user passes a string or other literal, remap to an object.
    if (!isPlainObject(data)) {
      data = {
        _: data,
      };
    }

    // save `page` for reuse
    data.page = this.page;

    return fn(data);
  }

  async function renderFileShortcodeFn(inputPath, data = {}, templateLang) {
    let fn = await renderFile.call(
      this,
      inputPath,
      templateLang,
      normalizeDirectories(eleventyConfig.dir),
      {
        templateConfig,
        extensionMap,
      }
    );

    if (fn === undefined) {
      return;
    } else if (typeof fn !== "function") {
      throw new Error(
        `The \`compile\` function did not return a function. Received ${fn}`
      );
    }

    // if the user passes a string or other literal, remap to an object.
    if (!isPlainObject(data)) {
      data = {
        _: data,
      };
    }

    // save `page` for re-use
    data.page = this.page;

    return fn(data);
  }

  // Render strings
  eleventyConfig.addJavaScriptFunction(opts.tagName, renderStringShortcodeFn);

  eleventyConfig.addLiquidTag(opts.tagName, function (liquidEngine) {
    return liquidTemplateTag(liquidEngine, opts.tagName);
  });

  eleventyConfig.addNunjucksTag(opts.tagName, function (nunjucksLib) {
    return nunjucksTemplateTag(nunjucksLib, opts.tagName);
  });

  // Render File
  eleventyConfig.addJavaScriptFunction(opts.tagNameFile, renderFileShortcodeFn);
  eleventyConfig.addLiquidShortcode(opts.tagNameFile, renderFileShortcodeFn);
  eleventyConfig.addNunjucksAsyncShortcode(
    opts.tagNameFile,
    renderFileShortcodeFn
  );
}

module.exports = EleventyPlugin;
