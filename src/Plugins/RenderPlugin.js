const path = require("path");
const fs = require("fs");
const fsp = fs.promises;

// TODO first-class Markdown container/component (will need to be synchronous for markdown-it)

const TemplatePath = require("../TemplatePath");
const TemplateRender = require("../TemplateRender");
const TemplateConfig = require("../TemplateConfig");
const Liquid = require("../Engines/Liquid");

function getFullIncludesDirectory(dir = {}) {
  let inputDir = dir.input || ".";
  let includesDir = dir.includes || "_includes";
  let fullIncludesDir = path.join(inputDir, includesDir);

  return fullIncludesDir;
}

async function render(content, templateLang, dir = {}, templateConfig) {
  if (!templateLang) {
    throw new Error(
      "Missing template syntax argument passed to the `template` shortcode."
    );
  }

  if (!templateConfig) {
    templateConfig = new TemplateConfig();
  }

  let includesDir = getFullIncludesDirectory(dir);
  let tr = new TemplateRender(templateLang, includesDir, templateConfig);
  tr.setEngineOverride(templateLang);

  return tr.getCompiledTemplate(content);
}

async function renderFile(inputPath, templateLang, dir = {}, templateConfig) {
  if (!inputPath) {
    throw new Error(
      "Missing file path argument passed to the `templatefile` shortcode."
    );
  }

  if (
    !fs.existsSync(TemplatePath.normalizeOperatingSystemFilePath(inputPath))
  ) {
    throw new Error(
      "Could not find render plugin file for renderFile, looking for: " +
        inputPath
    );
  }

  if (!templateConfig) {
    templateConfig = new TemplateConfig();
  }

  let includesDir = getFullIncludesDirectory(dir);
  let tr = new TemplateRender(inputPath, includesDir, templateConfig);
  if (templateLang) {
    tr.setEngineOverride(templateLang);
  }

  if (tr.engine.entry && tr.engine.entry.read === false) {
    return tr.getCompiledTemplate(null);
  }

  // TODO we could make this work with full templates (with front matter?)
  let content = await fsp.readFile(inputPath, "utf8");
  return tr.getCompiledTemplate(content);
}

function EleventyPlugin(eleventyConfig, options = {}) {
  function liquidTemplateTag(liquidEngine, tagName) {
    return {
      parse: function (tagToken, remainTokens) {
        this.name = tagToken.name;
        this.args = tagToken.args;
        this.tokens = [];

        var stream = liquidEngine.parser
          .parseStream(remainTokens)
          .on("template", (tpl) => this.tokens.push(tpl))
          .on("tag:end" + tagName, () => stream.stop())
          .on("end", () => {
            throw new Error(`tag ${tagToken.raw} not closed`);
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

        let start = this.tokens[0].token.begin;
        let end = this.tokens[this.tokens.length - 1].token.end;
        let body = this.tokens[0].token.input.substring(start, end);

        return shortcodeFn.call(normalizedContext, body, ...argArray);
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
          normalizedContext.page = context.ctx.page;
        }

        shortcodeFn
          .call(normalizedContext, body(), ...argArray)
          .then(function (returnValue) {
            resolve(null, new NunjucksLib.runtime.SafeString(returnValue));
          })
          .catch(function (e) {
            resolve(
              new Error(
                `Error with Nunjucks paired shortcode \`${tagName}\`${e.message}`
              ),
              null
            );
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

  async function shortcodeFn(content, templateLang, data = {}) {
    let fn = await render.call(
      this,
      content,
      templateLang,
      eleventyConfig.dir,
      templateConfig
    );

    // save `page` for reuse
    data.page = this.page;

    let output = await fn(data);
    // console.log( "--->", this.page.inputPath, "using", templateLang );
    // console.log( { data } );
    // console.log( { content } );
    // console.log( { output } );
    return output;
  }

  // Render strings
  eleventyConfig.addJavaScriptFunction(opts.tagName, shortcodeFn);

  eleventyConfig.addLiquidTag(opts.tagName, function (liquidEngine) {
    return liquidTemplateTag(liquidEngine, opts.tagName);
  });

  eleventyConfig.addNunjucksTag(opts.tagName, function (nunjucksLib) {
    return nunjucksTemplateTag(nunjucksLib, opts.tagName);
  });

  // Render File
  eleventyConfig.addLiquidShortcode(
    opts.tagNameFile,
    async function (inputPath, templateLang, data = {}) {
      let fn = await renderFile.call(
        this,
        inputPath,
        templateLang,
        eleventyConfig.dir,
        templateConfig
      );

      // save `page` for re-use
      data.page = this.page;

      let output = await fn(data);
      // console.log( "--->", this.page.inputPath, "using", inputPath, "using", templateLang );
      // console.log( { data } );
      // console.log( { output } );
      return output;
    }
  );
}

module.exports = EleventyPlugin;
