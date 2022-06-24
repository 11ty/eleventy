const test = require("ava");
const RenderPlugin = require("../src/Plugins/RenderPlugin");
const RenderManager = RenderPlugin.RenderManager;
const RenderPluginFile = RenderPlugin.File;
const RenderPluginString = RenderPlugin.String;

const VuePlugin = require("@11ty/eleventy-plugin-vue");

const Eleventy = require("../src/Eleventy");
const normalizeNewLines = require("./Util/normalizeNewLines");
const removeNewLines = require("./Util/removeNewLines");

const AddTestPathsPlugin = require("./stubs-render-dynamic-paths/plugin/AddTestPathsPlugin.js");

async function getTestOutput(input, configCallback = function () {}) {
  let elev = new Eleventy(input, "./_site/", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(RenderPlugin);

      eleventyConfig.addPlugin(AddTestPathsPlugin);

      eleventyConfig.path(
        "views",
        "./test/stubs-render-dynamic-paths/themes/child-theme"
      );
      eleventyConfig.path(
        "includes",
        "./test/stubs-render-dynamic-paths/_includes"
      );

      configCallback(eleventyConfig);
    },
  });

  elev.setIsVerbose(false);

  // Careful with this!
  // elev.disableLogger();

  await elev.init();

  let result = await elev.toJSON();

  if (!result.length) {
    throw new Error(`No Eleventy JSON output found for input: ${input}`);
  }
  return result;
}

async function getTestOutputForFile(inputFile, configCallback) {
  let result = await getTestOutput(inputFile, configCallback);
  let html = normalizeNewLines(result[0].content.trim());
  return html;
}

test("Use 11ty.js file in njk with child themed layout with partial from plugin theme", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-dynamic-paths/11tyjs-file-child-themed.njk"
  );

  t.is(
    html,
    `header of child theme

default layout of child theme
TESTING
TESTING

footer of plugin theme`
  );
});
