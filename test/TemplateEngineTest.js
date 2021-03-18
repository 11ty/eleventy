const test = require("ava");
const TemplateEngine = require("../src/Engines/TemplateEngine");
const TemplateConfig = require("../src/TemplateConfig");

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
