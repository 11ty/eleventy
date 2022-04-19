const path = require("path");
const { promises: fsp } = require("fs");
const { createHash } = require("crypto");
const { TemplatePath } = require("@11ty/eleventy-utils");

const rawContentLiquidTag = require("./Edge/LiquidEdge.js");
const rawContentNunjucksTag = require("./Edge/NunjucksEdge.js");

class PrecompiledNunjucks {
  constructor() {
    this.rawTemplates = {};
  }

  getPrecompiledTemplateKey(str) {
    let hash = createHash("sha256");
    hash.update(str);
    return "EleventyEdgeNunjucksPrecompile:" + hash.digest("hex");
  }

  setLibraries({ nunjucks, nunjucksEnv }) {
    this.nunjucks = nunjucks;
    this.nunjucksEnv = nunjucksEnv;
  }

  add(str) {
    // for precompiled template object key
    let key = this.getPrecompiledTemplateKey(str);
    this.rawTemplates[key] = str;
    return key;
  }

  toString() {
    let ret = [];
    if (Object.keys(this.rawTemplates).length > 0) {
      if (!this.nunjucks || !this.nunjucksEnv) {
        throw new Error("Missing Nunjucks and Nunjucks environment");
      }

      for (let key in this.rawTemplates) {
        let precompiled = this.nunjucks.precompileString(
          this.rawTemplates[key],
          {
            name: key,
            env: this.nunjucksEnv,
            asFunction: true,
            force: true,
            wrapper: function ([tmpl], opts) {
              // console.log( { templates, opts } );
              return `(function() {${tmpl.template}}())`;
            },
          }
        );

        ret.push(`"${key}": ${precompiled},`);
      }
    }

    return `"nunjucksPrecompiled": {
  ${ret.join("\n")}
}`;
  }
}

class EdgeTemplateDataID {
  constructor() {
    this.data = {};
  }

  reset() {
    this.data = {};
  }

  hasData(data = {}) {
    return Object.keys(data).length > 0;
  }

  getDataKey(data = {}) {
    if (!this.hasData(data)) {
      return;
    }

    let hash = createHash("sha256");
    hash.update(JSON.stringify(data));
    return "ELEVENTYEDGEDATA_" + hash.digest("hex");
  }

  addData(data) {
    let key = this.getDataKey(data);
    if (key) {
      this.data[key] = data;
      return key;
    }
  }

  toString() {
    return `"buildTimeData": ${JSON.stringify(this.data, null, 2)}`;
  }
}

let ids = new EdgeTemplateDataID();
let precompiledTemplates = new PrecompiledNunjucks();

function renderAsLiquid(
  functionName,
  body,
  langOverride,
  serializedData,
  extras = {}
) {
  // edge(serializedData)
  // edge(langOverride, serializedData)

  // Langoverride was not specified, reorder arguments and move everything up
  if (langOverride && typeof langOverride !== "string" && !serializedData) {
    serializedData = langOverride;
    langOverride = undefined;
  }

  let syntax = langOverride || this.page.templateSyntax;
  if (!syntax) {
    throw new Error(
      "Could not determine template syntax for Eleventy Edge. You may need to upgrade Eleventy!"
    );
  }

  let languages = syntax.split(",").map((entry) => entry.trim());

  let supportedLanguages = ["njk", "liquid", "html", "md"];
  if (!supportedLanguages.includes(languages[0])) {
    throw new Error(
      "The {% edge %} rendering shortcode does not yet support the `" +
        languages[0] +
        "` syntax as content to the helper."
    );
  }

  // Deno deploy doesn’t work with eval, so we need to precompile to workaround eval on
  // templates by precompiling all of our templates.
  if (languages[0] === "njk") {
    if (process.env.ELEVENTY_SERVERLESS) {
      throw new Error(
        'Due to template language limitations (specifically: use of `eval`), {% edge "njk" %} is not a supported template language for the {% edge %} shortcode when used on an Eleventy Serverless template. You have three options here: 1. Use another template language on the shortcode (e.g. `{% edge "liquid" %}`). 2. Use {% renderTemplate %} or remove the {% edge %} call altogether (unless you’re using a cached On-demand Builder the rendering is happening at request-time anyway) 3. (Perhaps least ideal) Refactor this template render to run at build-time instead of serverless mode.'
      );
    }

    body = precompiledTemplates.add(body);
  }

  let dataVar = "";
  let extraData = [];
  if (ids.hasData(serializedData)) {
    let key = ids.addData(serializedData);
    if (key) {
      if (process.env.ELEVENTY_SERVERLESS) {
        if (languages[0] === "liquid") {
          // We serialize this into the response (this data isn’t written to disk, but it may be saved in a CDN cache a la ODB)
          for (let propName in serializedData) {
            extraData.push(
              `{% assign ${propName} = ${JSON.stringify(
                serializedData[propName]
              )} %}`
            );
          }
        }
      } else {
        dataVar = ` ${key}`;
      }
    }
  }

  let types = {
    html: { comments: ["<!--", "-->"] },
    css: { comments: ["/*", "*/"] },
    js: { comments: ["/*", "*/"] },
  };
  let type = "html";
  if (this.page.url.endsWith(".css")) {
    type = "css";
  } else if (this.page.url.endsWith(".js")) {
    //  || this.page.url.endsWith(".cjs") || this.page.url.endsWith(".mjs")
    type = "js";
  }

  return `${
    types[type].comments[0]
  }ELEVENTYEDGE_${functionName} "${syntax}"${dataVar} %}${extraData.join(
    ""
  )}${body}ELEVENTYEDGE_${functionName}${types[type].comments[1]}`;
}

// Build time plugin to create ELEVENTYEDGE comments that will be later evaluated at the Edge
function EleventyEdgePlugin(eleventyConfig, opts = {}) {
  let options = Object.assign(
    {
      name: "edge",
      functionsDir: "./netlify/edge-functions/",
      compatibility: ">=2", // compatibity check with Eleventy core version
    },
    opts
  );

  // TODO add middleware support so that we can just run on Eleventy Dev Server directly
  // eleventyConfig.setServerOptions({
  //   middleware: [
  //     async (request, response, next) => {
  //       console.log( await next() );
  //     }
  //   ]
  // })

  eleventyConfig.on("eleventy.engine.njk", ({ nunjucks, environment }) => {
    precompiledTemplates.setLibraries({
      nunjucks: nunjucks,
      nunjucksEnv: environment,
    });
  });

  eleventyConfig.addNunjucksTag(
    options.name,
    function (nunjucksLib, nunjucksEnv) {
      return rawContentNunjucksTag(
        nunjucksLib,
        nunjucksEnv,
        renderAsLiquid,
        options.name
      );
    }
  );

  eleventyConfig.addLiquidTag(options.name, function (liquidEngine) {
    return rawContentLiquidTag(liquidEngine, renderAsLiquid, options.name);
  });

  eleventyConfig.addJavaScriptFunction(options.name, async function (...args) {
    return renderAsLiquid.call(this, options.name, ...args);
  });

  // Edge Functions with Serverless mode, don’t write files.
  if (!process.env.ELEVENTY_SERVERLESS) {
    eleventyConfig.on("eleventy.after", async () => {
      await fsp.mkdir(path.join(options.functionsDir, "_generated"), {
        recursive: true,
      });

      let content = [];
      if (options.compatibility) {
        content.push(
          `"eleventy": { "compatibility": "${options.compatibility}" }`
        );
      }
      content.push(ids.toString());
      content.push(precompiledTemplates.toString());

      let source = path.join(
        __dirname,
        "../../package/generated-eleventy-edge-lib.js"
      );
      let target = TemplatePath.addLeadingDotSlash(
        path.join(options.functionsDir, "_generated/eleventy-edge.js")
      );

      return Promise.all([
        fsp.writeFile(
          path.join(options.functionsDir, "_generated/precompiled.js"),
          `export default { ${content.join(",\n")} }`
        ),
        fsp.copyFile(source, target),
      ]);
    });
  }

  // TODO add a route checker to show a warning if edge shortcodes are used on pages that are not handled in edge function routes
  // TODO make the `npm run package` script a prepublish? https://docs.npmjs.com/cli/v6/using-npm/scripts#prepare-and-prepublish
}

module.exports = EleventyEdgePlugin;
