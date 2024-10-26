import test from "ava";

import EleventyServe from "../src/EleventyServe.js";
import TemplateConfig from "../src/TemplateConfig.js";

async function getServerInstance(eleventyConfig) {
  let es = new EleventyServe();
  if (!eleventyConfig) {
    eleventyConfig = new TemplateConfig();
    await eleventyConfig.init();
  }

  es.eleventyConfig = eleventyConfig;

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
  let eleventyConfig = new TemplateConfig();
  await eleventyConfig.init({ pathPrefix: "/web/" });

  let es = await getServerInstance(eleventyConfig);
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
  await es.initServerInstance();

  t.is(es.server.dir, "_site");
});

// This assert should work once updating the output dir of the server works.
test("Custom output dir is set correctly", async (t) => {
  let es = await getServerInstance();
  es.setOutputDir("x");
  await es.initServerInstance();

  t.is(es.outputDir, "x");

  t.is(es.server.dir, "x");
});
