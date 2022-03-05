const test = require("ava");
const EleventyServe = require("../src/EleventyServe");
const TemplateConfig = require("../src/TemplateConfig");

test("Constructor", (t) => {
  let es = new EleventyServe();
  let cfg = new TemplateConfig().getConfig();
  es.config = cfg;
  t.is(es.getPathPrefix(), "/");
});

test("Get Options", (t) => {
  let es = new EleventyServe();
  let cfg = new TemplateConfig().getConfig();
  cfg.pathPrefix = "/";
  es.config = cfg;
  es.setOutputDir("_site");

  t.deepEqual(es.getOptions(), {
    pathPrefix: "/",
    port: 8080,
  });
});

test("Get Options (with a pathPrefix)", (t) => {
  let es = new EleventyServe();
  let cfg = new TemplateConfig().getConfig();
  cfg.pathPrefix = "/web/";
  es.config = cfg;
  es.setOutputDir("_site");

  t.deepEqual(es.getOptions(), {
    pathPrefix: "/web/",
    port: 8080,
  });
});

test("Get Options (override in config)", (t) => {
  let es = new EleventyServe();
  let cfg = new TemplateConfig().getConfig();
  cfg.pathPrefix = "/";
  cfg.browserSyncConfig = {
    notify: true,
  };
  es.config = cfg;
  es.setOutputDir("_site");

  t.deepEqual(es.getOptions(), {
    pathPrefix: "/",
    port: 8080,
  });
});
