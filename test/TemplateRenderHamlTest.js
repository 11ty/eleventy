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

// Haml
test("Haml", (t) => {
  t.is(getNewTemplateRender("haml").getEngineName(), "haml");
});

test("Haml Render", async (t) => {
  let fn = await getNewTemplateRender("haml").getCompiledTemplate("%p= name");
  t.is((await fn({ name: "Zach" })).trim(), "<p>Zach</p>");
});

test("Haml Render: with Library Override", async (t) => {
  let tr = getNewTemplateRender("haml");

  let lib = require("hamljs");
  tr.engine.setLibrary(lib);

  let fn = await tr.getCompiledTemplate("%p= name");
  t.is((await fn({ name: "Zach" })).trim(), "<p>Zach</p>");
});
