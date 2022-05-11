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

// This is not yet supported and currently throws an error.
test.skip("Use 11ty.js in liquid", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/11tyjs.liquid"
  );
  t.is(html, `TESTING`);
});

test("Use nunjucks in liquid", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/nunjucks.liquid"
  );
  t.is(
    html,
    `* iHdiuqil
* lfjksdlba`
  );
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

test("Use nunjucks file in njk (uses renderTemplate inside of the nunjucks file)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/njk-file.njk"
  );
  t.is(
    html,
    `TESTING

TESTING IN LIQUID

* 999`
  );
});

test("Use 11ty.js file in njk", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/11tyjs-file.njk"
  );
  t.is(html, `TESTING`);
});

test("Use txt file in njk (override to 11ty.js)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/11tyjs-file-override.njk"
  );
  t.is(html, `TESTING`);
});

// Skip this for now, toJSON calls actually change the exitCode of the process when they error,
// which is not ideal.
test.skip("Use nunjucks file in liquid but it doesn’t exist", async (t) => {
  await t.throwsAsync(async () => {
    await getTestOutputForFile(
      "./test/stubs-render-plugin/njk-file-not-exist.liquid"
    );
  });
});

test("No syntax passed, uses parent page syntax: liquid", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/false.liquid"
  );
  t.is(
    html,
    `# Hello Bruno
* Testing`
  );
});

test("No syntax passed (uses parent page syntax), but does pass data: liquid", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/data-no-templatelang.liquid"
  );
  t.is(
    html,
    `# Hello Bruno
* Testing`
  );
});

// Not yet supported
test.skip("renderFile but the target has front matter.", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/using-frontmatter.liquid"
  );
  t.is(html, `frontmatterString`);
});

// Idea from https://twitter.com/raymondcamden/status/1460961620247650312
test("Capture nunjucks render output to a liquid variable", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/capture-njk.liquid"
  );
  t.is(html, `4`);
});

// Idea from https://twitter.com/raymondcamden/status/1460961620247650312
// Possibly blocked by async in {% set %} https://github.com/mozilla/nunjucks/issues/815
test("Capture liquid render output to a njk variable", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/capture-liquid.njk"
  );
  t.is(html, `4`);
});

test("Using a Vue renderFile inside of serverPrefetch (or `data`): Vue -> Liquid -> Markdown -> Vue", async (t) => {
  // We point this to a directory instead of a single input file because the Eleventy Vue plugin needs
  // to be able to find the Vue SFC files too (and won’t if we point to a single input vue file)
  let result = await getTestOutput(
    "./test/stubs-render-plugin-vue-nested/",
    function (eleventyConfig) {
      eleventyConfig.addPlugin(VuePlugin);
    }
  );

  let html = removeNewLines(result[0].content.trim());
  t.is(
    html,
    `<div><div><h1>This is 1.</h1><p><span>2</span></p></div><style>/* test.js Component */body {  color: red;}/* _includes/include.js Component */body {  color: rebeccapurple;}</style></div>`
  );
});

test("Remap non-object data to data._ if object is not passed in", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/bad-data.njk"
  );
  t.is(html, "string");
});

test("Direct use of render string plugin, rendering Nunjucks (and nested Liquid)", async (t) => {
  let renderMgr = new RenderManager();
  renderMgr.config(function (eleventyConfig) {
    eleventyConfig.addFilter("testing", function () {
      return "tested.";
    });
  });
  let fn = await renderMgr.compile(
    `{%- set nunjucksVar = 69 -%}
{{ hi }}
{{ nunjucksVar }}
{{ "who" | testing }}
{% renderTemplate "liquid", argData %}
{% assign liquidVar = 138 %}
* {{ hi }} test test {{ bye }} {{ liquidVar }}
{% endrenderTemplate %}
`,
    "njk"
  );

  let data = {
    hi: "nunjucksHi",
    argData: {
      hi: "liquidHi",
      bye: "liquidBye",
    },
  };
  let html = await fn(data);

  t.is(
    normalizeNewLines(html.trim()),
    `nunjucksHi
69
tested.


* liquidHi test test liquidBye 138`
  );
});

test("Direct use of render string plugin, rendering Liquid (and nested Nunjucks)", async (t) => {
  let renderMgr = new RenderManager();
  renderMgr.config(function (eleventyConfig) {
    eleventyConfig.addFilter("testing", function () {
      return "tested.";
    });
  });

  let fn = await renderMgr.compile(
    `{%- assign liquidVar = 69 -%}
{{ hi }}
{{ liquidVar }}
{{ "who" | testing }}
{% renderTemplate "njk", argData %}
{% set njkVar = 138 %}
* {{ hi }} test test {{ bye }} {{ njkVar }}
{% endrenderTemplate %}
`,
    "liquid"
  );
  let data = {
    hi: "liquidHi",
    argData: {
      hi: "njkHi",
      bye: "njkBye",
    },
  };
  let html = await fn(data);

  t.is(
    normalizeNewLines(html.trim()),
    `liquidHi
69
tested.


* njkHi test test njkBye 138`
  );
});

test("Direct use of render file plugin, rendering Nunjucks (and nested Liquid)", async (t) => {
  let fn = await RenderPluginFile(
    "./test/stubs-render-plugin/liquid-direct.njk",
    {
      config: function (eleventyConfig) {
        eleventyConfig.addPlugin(RenderPlugin);
        eleventyConfig.addFilter("testing", function () {
          return "tested.";
        });
      },
    }
  );
  let data = {
    hi: "liquidHi",
    argData: {
      hi: "njkHi",
      bye: "njkBye",
    },
  };
  let html = await fn(data);

  t.is(
    normalizeNewLines(html.trim()),
    `liquidHi
69
tested.


* njkHi test test njkBye 138`
  );
});

test("Use page in renderTemplate (liquid in liquid)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/liquid-page.liquid"
  );
  t.is(html, `/liquid-page/`);
});

test("Use page in renderTemplate (liquid in njk)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/liquid-page.njk"
  );
  t.is(html, `/liquid-page/`);
});

test("Use page in renderTemplate (njk in liquid)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/njk-page.liquid"
  );
  t.is(html, `/njk-page/`);
});

test("Use eleventy in renderTemplate (njk in liquid)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/njk-eleventy.liquid"
  );
  t.is(html, `1`);
});

test("Use eleventy in renderTemplate (liquid in njk)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/liquid-eleventy.njk"
  );
  t.is(html, `1`);
});
test.skip("Use nunjucks in liquid (access to all global data)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/nunjucks-global.liquid"
  );
  t.is(html, `globalHi`);
});

test.skip("Use liquid in njk (access to all global data)", async (t) => {
  let html = await getTestOutputForFile(
    "./test/stubs-render-plugin/liquid-global.njk"
  );
  t.is(html, `globalHi`);
});
