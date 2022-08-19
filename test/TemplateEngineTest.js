import test from "ava";
import TemplateEngine from "../src/Engines/TemplateEngine.js";
import TemplateConfig from "../src/TemplateConfig.js";

test("Unsupported engine", async (t) => {
  let eleventyConfig = new TemplateConfig();
  t.is(
    new TemplateEngine("doesnotexist", null, eleventyConfig).getName(),
    "doesnotexist"
  );
});

test("Supported engine", async (t) => {
  let eleventyConfig = new TemplateConfig();
  t.is(new TemplateEngine("ejs", null, eleventyConfig).getName(), "ejs");
});
