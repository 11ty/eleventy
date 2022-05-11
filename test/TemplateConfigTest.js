const test = require("ava");
const md = require("markdown-it");
const TemplateConfig = require("../src/TemplateConfig");

test("Template Config local config overrides base config", async (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.markdownTemplateEngine, "ejs");
  t.is(cfg.templateFormats.join(","), "md,njk");

  // merged, not overwritten
  t.true(Object.keys(cfg.keys).length > 1);
  t.truthy(Object.keys(cfg.handlebarsHelpers).length);
  t.truthy(Object.keys(cfg.nunjucksFilters).length);

  t.is(Object.keys(cfg.transforms).length, 1);

  t.is(
    cfg.transforms.prettyHtml(
      `<html><body><div></div></body></html>`,
      "test.html"
    ),
    `<html>
  <body>
    <div></div>
  </body>
</html>`
  );
});

test("Add liquid tag", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addLiquidTag("myTagName", function () {});
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidTags).indexOf("myTagName"), -1);
});

test("Add nunjucks tag", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addNunjucksTag("myNunjucksTag", function () {});
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksTags).indexOf("myNunjucksTag"), -1);
});

test("Add nunjucks global", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addNunjucksGlobal("myNunjucksGlobal1", function () {});
  templateCfg.userConfig.addNunjucksGlobal("myNunjucksGlobal2", 42);

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksGlobals).indexOf("myNunjucksGlobal1"), -1);
  t.not(Object.keys(cfg.nunjucksGlobals).indexOf("myNunjucksGlobal2"), -1);
});

test("Add liquid filter", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addLiquidFilter(
    "myFilterName",
    function (liquidEngine) {
      return {};
    }
  );

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidFilters).indexOf("myFilterName"), -1);
});

test("Add handlebars helper", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addHandlebarsHelper("myHelperName", function () {});

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.handlebarsHelpers).indexOf("myHelperName"), -1);
});

test("Add nunjucks filter", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addNunjucksFilter("myFilterName", function () {});

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test("Add universal filter", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addFilter("myFilterName", function () {});

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidFilters).indexOf("myFilterName"), -1);
  t.not(Object.keys(cfg.handlebarsHelpers).indexOf("myFilterName"), -1);
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test("Add namespaced universal filter", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.namespace("testNamespace", function () {
    templateCfg.userConfig.addFilter("MyFilterName", function () {});
  });

  let cfg = templateCfg.getConfig();
  t.not(
    Object.keys(cfg.liquidFilters).indexOf("testNamespaceMyFilterName"),
    -1
  );
  t.not(
    Object.keys(cfg.handlebarsHelpers).indexOf("testNamespaceMyFilterName"),
    -1
  );
  t.not(
    Object.keys(cfg.nunjucksFilters).indexOf("testNamespaceMyFilterName"),
    -1
  );
});

test("Add namespaced universal filter using underscore", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.namespace("testNamespace_", function () {
    templateCfg.userConfig.addFilter("myFilterName", function () {});
  });

  let cfg = templateCfg.getConfig();
  t.not(
    Object.keys(cfg.liquidFilters).indexOf("testNamespace_myFilterName"),
    -1
  );
  t.not(
    Object.keys(cfg.handlebarsHelpers).indexOf("testNamespace_myFilterName"),
    -1
  );
  t.not(
    Object.keys(cfg.nunjucksFilters).indexOf("testNamespace_myFilterName"),
    -1
  );
});

test("Add namespaced plugin", (t) => {
  let templateCfg = new TemplateConfig();

  templateCfg.userConfig.namespace("testNamespace", function () {
    templateCfg.userConfig.addPlugin(function (eleventyConfig) {
      eleventyConfig.addFilter("MyFilterName", function () {});
    });
  });

  let cfg = templateCfg.getConfig();
  t.not(
    Object.keys(cfg.liquidFilters).indexOf("testNamespaceMyFilterName"),
    -1
  );
  t.not(
    Object.keys(cfg.handlebarsHelpers).indexOf("testNamespaceMyFilterName"),
    -1
  );
  t.not(
    Object.keys(cfg.nunjucksFilters).indexOf("testNamespaceMyFilterName"),
    -1
  );
});

test("Add namespaced plugin using underscore", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.namespace("testNamespace_", function () {
    templateCfg.userConfig.addPlugin(function (config) {
      config.addFilter("myFilterName", function () {});
    });
  });

  let cfg = templateCfg.getConfig();
  t.not(
    Object.keys(cfg.liquidFilters).indexOf("testNamespace_myFilterName"),
    -1
  );
  t.not(
    Object.keys(cfg.handlebarsHelpers).indexOf("testNamespace_myFilterName"),
    -1
  );
  t.not(
    Object.keys(cfg.nunjucksFilters).indexOf("testNamespace_myFilterName"),
    -1
  );
});

test("Empty namespace", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.namespace("", function () {
    templateCfg.userConfig.addNunjucksFilter("myFilterName", function () {});
  });

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test("Nested Empty Inner namespace", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );

  templateCfg.userConfig.namespace("testNs", function () {
    templateCfg.userConfig.namespace("", function () {
      templateCfg.userConfig.addNunjucksFilter("myFilterName", function () {});
    });
  });

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("testNsmyFilterName"), -1);
});

test("Nested Empty Outer namespace", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.namespace("", function () {
    templateCfg.userConfig.namespace("testNs", function () {
      templateCfg.userConfig.addNunjucksFilter("myFilterName", function () {});
    });
  });

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("testNsmyFilterName"), -1);
});

// important for backwards compatibility with old
// `module.exports = function (eleventyConfig, pluginNamespace) {`
// plugin code
test("Non-string namespaces are ignored", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.namespace(["lkdsjflksd"], function () {
    templateCfg.userConfig.addNunjucksFilter("myFilterName", function () {});
  });

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test(".addPlugin oddity: I don’t think pluginNamespace was ever passed in here, but we don’t want this to break", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );

  templateCfg.userConfig.addPlugin(function (eleventyConfig, pluginNamespace) {
    eleventyConfig.namespace(pluginNamespace, () => {
      eleventyConfig.addNunjucksFilter("myFilterName", function () {});
    });
  });

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test("Test url universal filter with custom pathPrefix (no slash)", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.setPathPrefix("/testdirectory/");
  let cfg = templateCfg.getConfig();
  t.is(cfg.pathPrefix, "/testdirectory/");
});

test("setTemplateFormats(string)", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  // 0.11.0 removes dupes
  templateCfg.userConfig.setTemplateFormats("ejs,njk, liquid, njk");

  let cfg = templateCfg.getConfig();
  t.deepEqual(cfg.templateFormats, ["ejs", "njk", "liquid"]);
});

test("setTemplateFormats(array)", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.setTemplateFormats(["ejs", "njk", "liquid"]);

  let cfg = templateCfg.getConfig();
  t.deepEqual(cfg.templateFormats, ["ejs", "njk", "liquid"]);
});

test("setTemplateFormats(array, size 1)", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.setTemplateFormats(["liquid"]);

  let cfg = templateCfg.getConfig();
  t.deepEqual(cfg.templateFormats, ["liquid"]);
});

test("setTemplateFormats(empty array)", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.setTemplateFormats([]);

  let cfg = templateCfg.getConfig();
  t.deepEqual(cfg.templateFormats, []);
});

test("setTemplateFormats(null)", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.setTemplateFormats(null);

  let cfg = templateCfg.getConfig();
  t.true(cfg.templateFormats.length > 0);
});

test("multiple setTemplateFormats calls", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.setTemplateFormats("njk");
  templateCfg.userConfig.setTemplateFormats("pug");

  let cfg = templateCfg.getConfig();
  t.deepEqual(cfg.templateFormats, ["pug"]);
});

test("addTemplateFormats()", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addTemplateFormats("vue");

  let cfg = templateCfg.getConfig();
  // should have ALL of the original defaults
  t.deepEqual(cfg.templateFormats, ["md", "njk", "vue"]);
});

test("both setTemplateFormats and addTemplateFormats", (t) => {
  // Template Formats can come from three places
  // defaultConfig.js config API (not used yet)
  // defaultConfig.js config return object
  // project config file config API
  // project config file config return object

  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addTemplateFormats("vue");
  templateCfg.userConfig.setTemplateFormats("pug");

  let cfg = templateCfg.getConfig();
  t.deepEqual(cfg.templateFormats, ["pug", "vue"]);
});

test("libraryOverrides", (t) => {
  let mdLib = md();
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.setLibrary("md", mdLib);

  let cfg = templateCfg.getConfig();
  t.falsy(cfg.libraryOverrides.ldkja);
  t.falsy(cfg.libraryOverrides.njk);
  t.truthy(cfg.libraryOverrides.md);
  t.deepEqual(mdLib, cfg.libraryOverrides.md);
});

test("addGlobalData", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addGlobalData("function", () => new Date());

  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.globalData).indexOf("function"), -1);
});

test("Properly throws error on missing module #182", (t) => {
  t.throws(function () {
    let templateCfg = new TemplateConfig(
      require("../src/defaultConfig.js"),
      "./test/stubs/broken-config.js"
    );

    templateCfg.getConfig();
  });
});

test("Properly throws error when config returns a Promise", (t) => {
  t.throws(function () {
    let templateCfg = new TemplateConfig(
      require("../src/defaultConfig.js"),
      "./test/stubs/config-promise.js"
    );
    templateCfg.getConfig();
  });
});

test(".addWatchTarget adds a watch target", (t) => {
  let templateCfg = new TemplateConfig(
    require("../src/defaultConfig.js"),
    "./test/stubs/config.js"
  );
  templateCfg.userConfig.addWatchTarget("/testdirectory/");

  let cfg = templateCfg.getConfig();
  t.deepEqual(cfg.additionalWatchTargets, ["/testdirectory/"]);
});

test("Nested .addPlugin calls", (t) => {
  t.plan(2);
  let templateCfg = new TemplateConfig();

  templateCfg.userConfig.addPlugin(function OuterPlugin(eleventyConfig) {
    t.truthy(true);

    eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
      t.truthy(true);
    });
  });

  templateCfg.getConfig();
});

test("Nested .addPlugin calls (×3)", (t) => {
  t.plan(3);
  let templateCfg = new TemplateConfig();

  templateCfg.userConfig.addPlugin(function OuterPlugin(eleventyConfig) {
    t.truthy(true);

    eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
      t.truthy(true);

      eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
        t.truthy(true);
      });
    });
  });

  templateCfg.getConfig();
});

test("Nested .addPlugin calls order", (t) => {
  t.plan(3);
  let templateCfg = new TemplateConfig();
  let order = [];

  templateCfg.userConfig.addPlugin(function OuterPlugin(eleventyConfig) {
    order.push(1);
    t.deepEqual(order, [1]);

    eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
      order.push(2);
      t.deepEqual(order, [1, 2]);

      eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
        order.push(3);
        t.deepEqual(order, [1, 2, 3]);
      });
    });
  });

  templateCfg.getConfig();
});

test("Nested .addPlugin calls. More complex order", (t) => {
  t.plan(5);
  let templateCfg = new TemplateConfig();
  let order = [];

  templateCfg.userConfig.addPlugin(function OuterPlugin(eleventyConfig) {
    order.push("1");
    t.deepEqual(order, ["1"]);

    eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
      order.push("2");
      t.deepEqual(order, ["1", "2"]);

      eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
        order.push("3a");
        t.deepEqual(order, ["1", "2", "3a"]);
      });

      eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
        order.push("3b");
        t.deepEqual(order, ["1", "2", "3a", "3b"]);
      });
    });

    eleventyConfig.addPlugin(function InnerPlugin(eleventyConfig) {
      order.push("2b");
      t.deepEqual(order, ["1", "2", "3a", "3b", "2b"]);
    });
  });

  templateCfg.getConfig();
});
