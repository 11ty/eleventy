const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { TemplatePath } = require("@11ty/eleventy-utils");

const rawContentLiquidTag = require("./Edge/LiquidEdge.js");
const rawContentNunjucksTag = require("./Edge/NunjucksEdge.js");
const PrecompiledNunjucks = require("./Edge/PrecompiledNunjucks.js");
const EdgeTemplateDataID = require("./Edge/EdgeTemplateDataID.js");

class EdgeHelper {
  constructor() {
    this.ids = new EdgeTemplateDataID();
    this.precompiledTemplates = new PrecompiledNunjucks();
  }

  setOptions(options) {
    this.options = options;
  }

  getOutputPath(filepath) {
    return TemplatePath.addLeadingDotSlash(path.join(this.options.functionsDir, filepath));
  }

  async writeDefaultEdgeFunctionFile() {
    let filepath = this.getOutputPath("eleventy-edge.js");

    if (fs.existsSync(filepath)) {
      let contents = await fsp.readFile(filepath, "utf8");
      let trimmed = contents.trim();
      if (
        trimmed.startsWith(`import { EleventyEdge } from "./_generated/eleventy-edge.js";`) ||
        trimmed.startsWith(`import { EleventyEdge } from "eleventy:edge";`)
      ) {
        throw new Error(
          `Experimental early adopter API change alert! Unfortunately the default imports for Eleventy Edge in the latest canary have changed. The easiest thing you can do is delete your existing \`${path.join(
            this.options.functionsDir,
            "eleventy-edge.js"
          )}\` and let Eleventy generate a new one for you. The new import should be \`import { EleventyEdge, precompiledAppData } from "./_generated/eleventy-edge-app.js";\``
        );
      }
    } else {
      let defaultContentPath = TemplatePath.absolutePath(
        __dirname,
        "./DefaultEdgeFunctionContent.js"
      );

      let contents = await fsp.readFile(defaultContentPath, "utf8");
      contents = contents.replace(/\%\%EDGE_NAME\%\%/g, this.options.name);
      contents = contents.replace(/\%\%EDGE_VERSION\%\%/g, this.options.eleventyEdgeVersion);
      return fsp.writeFile(filepath, contents);
    }
  }
}

let helper = new EdgeHelper();

function renderAsLiquid(functionName, body, langOverride, serializedData, extras = {}) {
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

    body = helper.precompiledTemplates.add(body);
  }

  let dataVar = "";
  let extraData = [];
  if (helper.ids.hasData(serializedData)) {
    let key = helper.ids.addData(serializedData);
    if (key) {
      if (process.env.ELEVENTY_SERVERLESS) {
        if (languages[0] === "liquid") {
          // We serialize this into the response (this data isn’t written to disk, but it may be saved in a CDN cache a la ODB)
          for (let propName in serializedData) {
            extraData.push(
              `{% assign ${propName} = ${JSON.stringify(serializedData[propName])} %}`
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
  // when permalink is false, this.page.url is false
  if (this.page.url) {
    if (this.page.url.endsWith(".css")) {
      type = "css";
    } else if (this.page.url.endsWith(".js")) {
      // TODO more extensions here?
      type = "js";
    }
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

      // for the default Deno import
      eleventyEdgeVersion: "2.0.2",

      // runtime compatibility check with Eleventy core version
      compatibility: ">=2",
    },
    opts
  );

  helper.setOptions(options);

  // TODO add middleware support so that we can just run on Eleventy Dev Server directly (needs ESM first)
  // eleventyConfig.setServerOptions({
  //   middleware: [
  //     async (request, response, next) => {
  //       console.log( await next() );
  //     }
  //   ]
  // })

  eleventyConfig.on("eleventy.engine.njk", ({ nunjucks, environment }) => {
    helper.precompiledTemplates.setLibraries({
      nunjucks: nunjucks,
      nunjucksEnv: environment,
    });
  });

  eleventyConfig.addNunjucksTag(options.name, function (nunjucksLib, nunjucksEnv) {
    return rawContentNunjucksTag(nunjucksLib, nunjucksEnv, renderAsLiquid, options.name);
  });

  eleventyConfig.addLiquidTag(options.name, function (liquidEngine) {
    return rawContentLiquidTag(liquidEngine, renderAsLiquid, options.name);
  });

  eleventyConfig.addJavaScriptFunction(options.name, async function (...args) {
    return renderAsLiquid.call(this, options.name, ...args);
  });

  // Edge Functions with Serverless mode, don’t write files.
  if (!process.env.ELEVENTY_SERVERLESS) {
    // Generate app eleventy-edge-app.js file and generate default edge function (if needed)
    eleventyConfig.on("eleventy.after", async () => {
      await fsp.mkdir(path.join(options.functionsDir, "_generated"), {
        recursive: true,
      });

      let content = [];
      if (options.compatibility) {
        content.push(`"eleventy": { "compatibility": "${options.compatibility}" }`);
      }
      content.push(helper.ids.toString());
      content.push(helper.precompiledTemplates.toString());

      // New replacement for `eleventy:edge` and `eleventy-edge-app-data.js` imports.
      await fsp.writeFile(
        path.join(options.functionsDir, "_generated/eleventy-edge-app.js"),
        `import { EleventyEdge } from "https://cdn.11ty.dev/edge@${
          options.eleventyEdgeVersion
        }/eleventy-edge.js";

const precompiledAppData = { ${content.join(",\n")} };

export { EleventyEdge, precompiledAppData }`
      );

      await helper.writeDefaultEdgeFunctionFile();
    });
  }

  // TODO add a route checker to show a warning if edge shortcodes are used on pages that are not handled in edge function routes
}

module.exports = EleventyEdgePlugin;
