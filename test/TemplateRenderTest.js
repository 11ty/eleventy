const test = require("ava");
const TemplateRender = require("../src/TemplateRender");
const TemplateConfig = require("../src/TemplateConfig");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");

function getNewTemplateRender(name, inputDir) {
  let eleventyConfig = new TemplateConfig();
  let tr = new TemplateRender(name, inputDir, eleventyConfig);
  tr.extensionMap = new EleventyExtensionMap([], eleventyConfig);
  return tr;
}

test("Basic", (t) => {
  t.throws(() => {
    let tr = getNewTemplateRender("sldkjfkldsj");
    tr.init("sldkjfkldsj");
  });
});

test("Includes Dir", async (t) => {
  t.is(getNewTemplateRender("liquid", "./test/stubs").getIncludesDir(), "test/stubs/_includes");
});

test("Invalid override", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs");
  t.throws(() => {
    tr.setEngineOverride("lslkdjf");
  });
});

test("Valid Override", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs");
  tr.setEngineOverride("njk");
  t.is(tr.getEngineName(), "njk");
  t.truthy(tr.isEngine("njk"));
});

test("Parse Overrides to get Prioritized Engine List", async (t) => {
  t.deepEqual(TemplateRender.parseEngineOverrides(""), []);
  t.deepEqual(TemplateRender.parseEngineOverrides(null), []);
  t.deepEqual(TemplateRender.parseEngineOverrides(undefined), []);
  t.deepEqual(TemplateRender.parseEngineOverrides(false), []);
  t.deepEqual(TemplateRender.parseEngineOverrides("html"), []);
  t.deepEqual(TemplateRender.parseEngineOverrides("html,html"), []);
  t.deepEqual(TemplateRender.parseEngineOverrides("html,md,md"), ["md"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("liquid,md"), ["md", "liquid"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("liquid"), ["liquid"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("njk"), ["njk"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("liquid,html"), ["liquid"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("liquid,md,html"), ["md", "liquid"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("njk,njk"), ["njk"]);

  t.throws(function () {
    TemplateRender.parseEngineOverrides("njk,liquid");
  });
  t.throws(function () {
    TemplateRender.parseEngineOverrides("liquid,njk,html");
  });
});

test("Make sure getEnginesList returns a string", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs");
  t.is(tr.getEnginesList("njk,md"), "njk,md");
});
