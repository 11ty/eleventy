import test from "ava";
import TemplateConfig from "../src/TemplateConfig";
// import eleventyConfig from "../src/EleventyConfig";

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
  t.is(Object.keys(cfg.handlebarsHelpers).length, 1);
  t.is(Object.keys(cfg.nunjucksFilters).length, 2);

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

// test("Add liquid tag", t => {
//   let templateCfg = new TemplateConfig(
//     require("../config.js"),
//     "./test/stubs/config.js"
//   );
//   eleventyConfig.addLiquidTag("myTagName", function() {}, function() {});

//   let cfg = templateCfg.getConfig();
//   t.true(Object.keys(cfg.liquidTags).length > 1);
// });
