import test, { skip } from "ava";
import TemplateRender from "../src/TemplateRender.js";
import TemplateConfig from "../src/TemplateConfig.js";
import EleventyExtensionMap from "../src/EleventyExtensionMap.js";

function getNewTemplateRender(name, inputDir) {
  let eleventyConfig = new TemplateConfig();
  let tr = new TemplateRender(name, inputDir, eleventyConfig);
  tr.extensionMap = new EleventyExtensionMap([], eleventyConfig);
  return tr;
}

// Mustache
test("Mustache", async (t) => {
  t.is(getNewTemplateRender("mustache").getEngineName(), "mustache");
});

test("Mustache Render", async (t) => {
  let fn = await getNewTemplateRender("mustache").getCompiledTemplate(
    "<p>{{name}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Mustache Render Partial (raw text content)", async (t) => {
  let fn = await getNewTemplateRender(
    "mustache",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{{> included}}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

skip("Mustache Render Partial (relative path, raw text content)", async (t) => {
  let fn = await getNewTemplateRender(
    "./test/stubs/does_not_exist_and_thats_ok.mustache",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{{> ./includedrelative}}</p>");
  t.is(await fn(), "<p>This is an includdde.</p>");
});

test("Mustache Render Partial (uses a variable in content)", async (t) => {
  let fn = await getNewTemplateRender(
    "mustache",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{{> includedvar}}</p>");
  t.is(await fn({ name: "Zach" }), "<p>This is a Zach.</p>");
});

test("Mustache Render Partial (Subdirectory)", async (t) => {
  let fn = await getNewTemplateRender(
    "mustache",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{{> subfolder/included}}</p>");
  t.is(await fn({ name: "Zach" }), "<p>This is an include.</p>");
});

test("Mustache Render: with Library Override", async (t) => {
  let tr = getNewTemplateRender("mustache");

  let lib = await import("mustache");
  tr.engine.setLibrary(lib);

  let fn = await tr.getCompiledTemplate("<p>{{name}}</p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Mustache Render Unescaped Output (no HTML)", async (t) => {
  let fn = await getNewTemplateRender("mustache").getCompiledTemplate(
    "<p>{{{name}}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Mustache Render Escaped Output", async (t) => {
  let fn = await getNewTemplateRender("mustache").getCompiledTemplate(
    "<p>{{name}}</p>"
  );
  t.is(
    await fn({ name: "<b>Zach</b>" }),
    "<p>&lt;b&gt;Zach&lt;&#x2F;b&gt;</p>"
  );
});

test("Mustache Render Unescaped Output (HTML)", async (t) => {
  let fn = await getNewTemplateRender("mustache").getCompiledTemplate(
    "<p>{{{name}}}</p>"
  );
  t.is(await fn({ name: "<b>Zach</b>" }), "<p><b>Zach</b></p>");
});
