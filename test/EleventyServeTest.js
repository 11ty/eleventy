import test from "ava";
import EleventyServe from "../src/EleventyServe.js";
import TemplateConfig from "../src/TemplateConfig.js";

async function getServerInstance(cfg) {
  let es = new EleventyServe();
  if (!cfg) {
    cfg = new TemplateConfig().getConfig();
  }
  es.config = await cfg;
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
  let cfg = await new TemplateConfig().getConfig();
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
