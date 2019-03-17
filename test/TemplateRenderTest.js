import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

test("Basic", t => {
  // Path is unnecessary but supported
  t.is(TemplateRender.cleanupEngineName("default.ejs"), "ejs");
  t.true(TemplateRender.hasEngine("default.ejs"));
  t.is(new TemplateRender("default.ejs").getEngineName(), "ejs");

  // Better
  t.is(TemplateRender.cleanupEngineName("ejs"), "ejs");
  t.is(TemplateRender.cleanupEngineName("EjS"), "ejs");
  t.true(TemplateRender.hasEngine("EjS"));
  t.true(TemplateRender.hasEngine("ejs"));
  t.is(new TemplateRender("ejs").getEngineName(), "ejs");

  t.falsy(TemplateRender.cleanupEngineName("sldkjfkldsj"));
  t.false(TemplateRender.hasEngine("sldkjfkldsj"));
});

test("Includes Dir", async t => {
  t.is(
    new TemplateRender("ejs", "./test/stubs").getIncludesDir(),
    "test/stubs/_includes"
  );
});

test("Invalid override", async t => {
  let tr = new TemplateRender("ejs", "./test/stubs");
  t.throws(() => {
    tr.setEngineOverride("lslkdjf");
  });
});

test("Valid Override", async t => {
  let tr = new TemplateRender("ejs", "./test/stubs");
  tr.setEngineOverride("njk");
  t.is(tr.getEngineName(), "njk");
  t.truthy(tr.isEngine("njk"));
});

test("Parse Overrides to get Prioritized Engine List", async t => {
  t.deepEqual(TemplateRender.parseEngineOverrides(""), []);
  t.deepEqual(TemplateRender.parseEngineOverrides(null), []);
  t.deepEqual(TemplateRender.parseEngineOverrides(undefined), []);
  t.deepEqual(TemplateRender.parseEngineOverrides(false), []);
  t.deepEqual(TemplateRender.parseEngineOverrides("html"), []);
  t.deepEqual(TemplateRender.parseEngineOverrides("html,html"), []);
  t.deepEqual(TemplateRender.parseEngineOverrides("html,md,md"), ["md"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("ejs,md"), ["md", "ejs"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("ejs"), ["ejs"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("njk"), ["njk"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("ejs,html"), ["ejs"]);
  t.deepEqual(TemplateRender.parseEngineOverrides("ejs,md,html"), [
    "md",
    "ejs"
  ]);
  t.deepEqual(TemplateRender.parseEngineOverrides("njk,njk"), ["njk"]);

  t.throws(function() {
    TemplateRender.parseEngineOverrides("njk,ejs");
  });
  t.throws(function() {
    TemplateRender.parseEngineOverrides("ejs,njk,html");
  });
});
