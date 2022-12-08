const test = require("ava");
const EleventyServe = require("../src/EleventyServe");
const TemplateConfig = require("../src/TemplateConfig");

async function getServerInstance(cfg) {
  let es = new EleventyServe();
  if (!cfg) {
    cfg = new TemplateConfig().getConfig();
  }
  es.config = cfg;
  await es.init();

  delete es.options.logger;
  delete es.options.module;

  return es;
}

test("Constructor", async (t) => {
  let es = await getServerInstance();
  t.is(es.options.pathPrefix, "/");
});

test("Get Options", async (t) => {
  let es = await getServerInstance();
  es.setOutputDir("_site");

  t.deepEqual(es.options, {
    pathPrefix: "/",
    port: 8080,
  });
});

test("Get Options (with a pathPrefix)", async (t) => {
  let cfg = new TemplateConfig().getConfig();
  cfg.pathPrefix = "/web/";

  let es = await getServerInstance(cfg);
  es.setOutputDir("_site");

  t.deepEqual(es.options, {
    pathPrefix: "/web/",
    port: 8080,
  });
});

test("Get Options (override in config)", async (t) => {
  let es = await getServerInstance();
  es.setOutputDir("_site");

  t.deepEqual(es.options, {
    pathPrefix: "/",
    port: 8080,
  });
});

test("Sanity test that default output is set correctly", async (t) => {
  let es = await getServerInstance();
  es.setOutputDir("_site");

  t.is(es.server.dir, "_site");
});

// This assert should work once updating the output dir of the server works.
test.skip("Custom output dir is set correctly", async (t) => {
  let es = await getServerInstance();
  es.setOutputDir("x");

  t.is(es.outputDir, "x");

  t.is(es.server.dir, "x");
});
