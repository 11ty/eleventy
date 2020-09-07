const test = require("ava");
const UserConfig = require("../src/UserConfig");

test("Template Formats", (t) => {
  let cfg = new UserConfig();

  t.falsy(cfg.getMergingConfigObject().templateFormats);

  cfg.setTemplateFormats("njk,liquid");
  t.deepEqual(cfg.getMergingConfigObject().templateFormats, ["njk", "liquid"]);

  // setting multiple times takes the last one
  cfg.setTemplateFormats("njk,liquid,pug");
  cfg.setTemplateFormats("njk,liquid");
  t.deepEqual(cfg.getMergingConfigObject().templateFormats, ["njk", "liquid"]);
});

test("Template Formats (Arrays)", (t) => {
  let cfg = new UserConfig();

  t.falsy(cfg.getMergingConfigObject().templateFormats);

  cfg.setTemplateFormats(["njk", "liquid"]);
  t.deepEqual(cfg.getMergingConfigObject().templateFormats, ["njk", "liquid"]);

  // setting multiple times takes the last one
  cfg.setTemplateFormats(["njk", "liquid", "pug"]);
  cfg.setTemplateFormats(["njk", "liquid"]);
  t.deepEqual(cfg.getMergingConfigObject().templateFormats, ["njk", "liquid"]);
});
