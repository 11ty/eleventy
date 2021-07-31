const test = require("ava");
const EleventyServe = require("../src/EleventyServe");
const TemplateConfig = require("../src/TemplateConfig");

test("Constructor", (t) => {
  let es = new EleventyServe();
  let cfg = new TemplateConfig().getConfig();
  es.config = cfg;
  t.is(es.getPathPrefix(), "/");
});

test("Directories", (t) => {
  let es = new EleventyServe();
  let cfg = new TemplateConfig().getConfig();
  es.config = cfg;

  es.setOutputDir("_site");
  t.is(es.getRedirectDir("test"), "_site/test");
  t.is(es.getRedirectFilename("test"), "_site/test/index.html");
});

test("Get Options", (t) => {
  let es = new EleventyServe();
  let cfg = new TemplateConfig().getConfig();
  cfg.pathPrefix = "/";
  es.config = cfg;
  es.setOutputDir("_site");

  t.deepEqual(es.getOptions(), {
    ignore: ["node_modules"],
    index: "index.html",
    notify: false,
    open: false,
    port: 8080,
    server: {
      baseDir: "_site",
    },
    watch: false,
    ui: false,
    ghostMode: false,
  });
});

test("Get Options (with a pathPrefix)", (t) => {
  let es = new EleventyServe();
  let cfg = new TemplateConfig().getConfig();
  cfg.pathPrefix = "/web/";
  es.config = cfg;
  es.setOutputDir("_site");

  t.deepEqual(es.getOptions(), {
    ignore: ["node_modules"],
    index: "index.html",
    notify: false,
    open: false,
    port: 8080,
    server: {
      baseDir: "_site/_eleventy_redirect",
      routes: {
        "/web/": "_site",
      },
    },
    watch: false,
    ui: false,
    ghostMode: false,
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
    ignore: ["node_modules"],
    index: "index.html",
    notify: true,
    open: false,
    port: 8080,
    server: {
      baseDir: "_site",
    },
    watch: false,
    ui: false,
    ghostMode: false,
  });
});
