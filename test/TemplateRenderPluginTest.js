const test = require("ava");
const RenderPlugin = require("../src/Plugins/RenderPlugin");
const VuePlugin = require("@11ty/eleventy-plugin-vue");

const Eleventy = require("../src/Eleventy");
const normalizeNewLines = require("./Util/normalizeNewLines");

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

test("Use liquid in nunjucks", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/liquid.njk"
  );
  t.is(
    html,
    `nunjucksHi
69


* liquidHi test test liquidBye 138`
  );
});

test("Use liquid+markdown in 11ty.js", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/liquid-md.11ty.js"
  );
  t.is(
    html,
    `<h1>Markdown</h1>
<ul>
<li>2</li>
</ul>`
  );
});

test("Use nunjucks in 11ty.js", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/nunjucks.11ty.js"
  );
  t.is(html, `* iHtpircsavaj`);
});

test("Use nunjucks in liquid", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/nunjucks.liquid"
  );
  t.is(html, `* iHdiuqil`);
});

test("Use markdown in liquid", async (t) => {
  let html = await getTestOutputForFile("./test/stubs-render-plugin/md.liquid");
  t.is(
    html,
    `<h1>Hello {{ hi }}</h1>
<ul>
<li>Testing</li>
</ul>`
  );
});

test("Use vue in liquid", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/vue.liquid",
    function (eleventyConfig) {
      eleventyConfig.addPlugin(VuePlugin);
    }
  );
  t.is(html, `<div> HELLO WE ARE VUEING <p>liquidHi</p></div>`);
});

// Skip until we can get this working on Windows
test("Use vue SFC file in liquid", async (t) => {
  // We point this to a directory instead of a single input file because the Eleventy Vue plugin needs
  // to be able to find the Vue SFC files too (and won’t if we point to a single input vue file)
  let result = await getTestOutput(
    "./test/stubs-render-plugin-vue/",
    function (eleventyConfig) {
      eleventyConfig.addPlugin(VuePlugin);
    }
  );
  let html = normalizeNewLines(result[0].content.trim());
  t.is(html, `<span>liquidHi</span>`);
});

test("Use nunjucks file in liquid (uses renderTemplate inside of the nunjucks file)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/njk-file.liquid"
  );
  t.is(
    html,
    `TESTING

TESTING IN LIQUID

* 999`
  );
});

test("Use nunjucks file in liquid without specifying syntax (should infer from extension)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/njk-file-no-syntax.liquid"
  );
  t.is(
    html,
    `TESTING

TESTING IN LIQUID

* 999`
  );
});

// Skip this for now, toJSON calls actually change the exitCode of the process when they error, which is probably not what we want?
// Not sure yet.
test.skip("Use nunjucks file in liquid but it doesn’t exist", async (t) => {
  await t.throwsAsync(async () => {
    await getTestOutputForFile(
      "./test/stubs-render-plugin/njk-file-not-exist.liquid"
    );
  });
});
