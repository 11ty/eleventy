import test from "ava";
import TemplateRender, { parseEngineOverrides } from "../src/TemplateRender.js";
import TemplateConfig from "../src/TemplateConfig.js";
import EleventyExtensionMap from "../src/EleventyExtensionMap.js";

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
  t.is(
    getNewTemplateRender("ejs", "./test/stubs").getIncludesDir(),
    "test/stubs/_includes"
  );
});

test("Invalid override", async (t) => {
  let tr = getNewTemplateRender("ejs", "./test/stubs");
  t.throws(() => {
    tr.setEngineOverride("lslkdjf");
  });
});

test("Valid Override", async (t) => {
  let tr = getNewTemplateRender("ejs", "./test/stubs");
  tr.setEngineOverride("njk");
  t.is(tr.getEngineName(), "njk");
  t.truthy(tr.isEngine("njk"));
});

test("Parse Overrides to get Prioritized Engine List", async (t) => {
  t.deepEqual(parseEngineOverrides(""), []);
  t.deepEqual(parseEngineOverrides(null), []);
  t.deepEqual(parseEngineOverrides(undefined), []);
  t.deepEqual(parseEngineOverrides(false), []);
  t.deepEqual(parseEngineOverrides("html"), []);
  t.deepEqual(parseEngineOverrides("html,html"), []);
  t.deepEqual(parseEngineOverrides("html,md,md"), ["md"]);
  t.deepEqual(parseEngineOverrides("ejs,md"), ["md", "ejs"]);
  t.deepEqual(parseEngineOverrides("ejs"), ["ejs"]);
  t.deepEqual(parseEngineOverrides("njk"), ["njk"]);
  t.deepEqual(parseEngineOverrides("ejs,html"), ["ejs"]);
  t.deepEqual(parseEngineOverrides("ejs,md,html"), ["md", "ejs"]);
  t.deepEqual(parseEngineOverrides("njk,njk"), ["njk"]);

  t.throws(function () {
    parseEngineOverrides("njk,ejs");
  });
  t.throws(function () {
    parseEngineOverrides("ejs,njk,html");
  });
});

test("Make sure getEnginesList returns a string", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs");
  t.is(tr.getEnginesList("njk,md"), "njk,md");
});
