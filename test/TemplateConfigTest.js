import test from "ava";
import TemplateConfig from "../src/TemplateConfig";
import eleventyConfig from "../src/EleventyConfig";

test("Template Config local config overrides base config", async t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.markdownTemplateEngine, "ejs");
  t.is(cfg.templateFormats.join(","), "md,njk");

  // merged, not overwritten
  t.true(Object.keys(cfg.keys).length > 1);
  t.truthy(Object.keys(cfg.handlebarsHelpers).length);
  t.truthy(Object.keys(cfg.nunjucksFilters).length);

  t.is(Object.keys(cfg.filters).length, 1);

  t.is(
    cfg.filters.prettyHtml(
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

test("Add liquid tag", t => {
  eleventyConfig.addLiquidTag("myTagName", function() {}, function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidTags).indexOf("myTagName"), -1);
});

test("Add liquid filter", t => {
  eleventyConfig.addLiquidFilter("myFilterName", function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidFilters).indexOf("myFilterName"), -1);
});

test("Add handlebars helper", t => {
  eleventyConfig.addHandlebarsHelper("myHelperName", function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.handlebarsHelpers).indexOf("myHelperName"), -1);
});

test("Add nunjucks filter", t => {
  eleventyConfig.addNunjucksFilter("myFilterName", function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test("Add universal filter", t => {
  eleventyConfig.addFilter("myFilterName", function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidFilters).indexOf("myFilterName"), -1);
  t.not(Object.keys(cfg.handlebarsHelpers).indexOf("myFilterName"), -1);
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test("Test url universal filter with custom pathPrefix (no slash)", t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  templateCfg.setPathPrefix("/testdirectory/");
  let cfg = templateCfg.getConfig();
  t.is(cfg.pathPrefix, "/testdirectory/");
});
