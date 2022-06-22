const test = require("ava");
const RenderPlugin = require("../src/Plugins/RenderPlugin");
const RenderManager = RenderPlugin.RenderManager;
const RenderPluginFile = RenderPlugin.File;
const RenderPluginString = RenderPlugin.String;

const VuePlugin = require("@11ty/eleventy-plugin-vue");

const Eleventy = require("../src/Eleventy");
const normalizeNewLines = require("./Util/normalizeNewLines");
const removeNewLines = require("./Util/removeNewLines");

async function getTestOutput(input, configCallback = function () {}) {
  let elev = new Eleventy(input, "./_site/", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(RenderPlugin);
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

test("Use 11ty.js file in njk", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-dynamic-paths/11tyjs-file.njk",
    function (eleventyConfig) {
      eleventyConfig.path(
        "includes",
        "./test/stubs-render-dynamic-paths/_includes"
      );
    }
  );
  t.is(
    html,
    `TESTING
TESTING`
  );
});

test("Use 11ty.js file in njk with default layout", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-dynamic-paths/11tyjs-file-default-layout.njk",
    function (eleventyConfig) {
      eleventyConfig.path(
        "includes",
        "./test/stubs-render-dynamic-paths/_includes"
      );
    }
  );
  // console.log(html);
  t.is(
    html,
    `above
TESTING
TESTING

below`
  );
});

test("Use 11ty.js file in njk with themed layout", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-dynamic-paths/11tyjs-file-themed.njk",
    function (eleventyConfig) {
      eleventyConfig.path(
        "includes",
        "./test/stubs-render-dynamic-paths/_includes"
      );
      eleventyConfig.path(
        "views",
        "./test/stubs-render-dynamic-paths/themes/parent-theme"
      );
    }
  );
  // console.log(html);
  t.is(
    html,
    `header of parent theme

default layout of parent theme
TESTING
TESTING

footer of parent theme`
  );
});

// For some reason, sometimes the path configurations are moved around between instances and async calls.
// If you run this test multiple times, sometimes the one above and sometimes the one below fails.
// I'm not sure, if this has something to do with 11ty internal caching or if this is some weird JS
// async instance pointer issue.
// I moved the child theme test to a separate file to bypass the failure.
// see: `TemplateRenderDynamicPathsTestChildTheme.js`

// test("Use 11ty.js file in njk with child themed layout", async (t) => {
//   let html = await getTestOutputForFile(
//     "./test/stubs-render-dynamic-paths/11tyjs-file-child-themed.njk",
//     function(eleventyConfig) {
//       eleventyConfig.path('views', './test/stubs-render-dynamic-paths/themes/parent-theme');
//       eleventyConfig.path('views', './test/stubs-render-dynamic-paths/themes/child-theme');
//       eleventyConfig.path('includes', './test/stubs-render-dynamic-paths/_includes');
//     }
//   );
// // console.log(html);
//   t.is(html, `header of child theme
//
// default layout of child theme
// TESTING
// TESTING
//
// footer of parent theme`);
// });
