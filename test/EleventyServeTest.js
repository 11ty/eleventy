import test from "ava";
import EleventyServe from "../src/EleventyServe";

test("Constructor", t => {
  let es = new EleventyServe();
  t.is(es.getPathPrefix(), "/");
});

test("Directories", t => {
  let es = new EleventyServe();
  es.setOutputDir("_site");
  t.is(es.getRedirectDir("test"), "_site/test");
  t.is(es.getRedirectFilename("test"), "_site/test/index.html");
});
