const test = require("ava");
const TemplateEngine = require("../src/Engines/TemplateEngine");

test("Unsupported engine", async (t) => {
  t.is(new TemplateEngine("doesnotexist").getName(), "doesnotexist");
});

test("Supported engine", async (t) => {
  t.is(new TemplateEngine("ejs").getName(), "ejs");
});
