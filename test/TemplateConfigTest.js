import test from "ava";
import TemplateConfig from "../src/TemplateConfig";

test("Template Config local config overrides base config", async t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.markdownTemplateEngine, "ejs");
  t.is(cfg.templateFormats.join(","), "md,njk");

  t.is(Object.keys(cfg.handlebarsHelpers).length, 0);
  t.is(Object.keys(cfg.nunjucksFilters).length, 2);
});
