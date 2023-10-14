import test from "ava";

import TemplateConfig from "../src/TemplateConfig.js";
import TemplateEngine from "../src/Engines/TemplateEngine.js";

test("Unsupported engine", async (t) => {
  let eleventyConfig = new TemplateConfig();
  await eleventyConfig.init();

  let engine = new TemplateEngine("doesnotexist", null, eleventyConfig);
  t.is(engine.getName(), "doesnotexist");
});

test("Supported engine", async (t) => {
  let eleventyConfig = new TemplateConfig();
  await eleventyConfig.init();

  t.is(new TemplateEngine("liquid", null, eleventyConfig).getName(), "liquid");
});
