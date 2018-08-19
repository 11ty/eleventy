import test from "ava";
import EleventyExtensionMap from "../src/EleventyExtensionMap";

test("Empty formats", t => {
  let map = new EleventyExtensionMap([]);
  t.deepEqual(map.getGlobs(), []);
});
test("Single format", t => {
  let map = new EleventyExtensionMap(["pug"]);
  t.deepEqual(map.getGlobs(), ["./**/*.pug"]);
  t.deepEqual(map.getGlobs("src"), ["./src/**/*.pug"]);
});
test("Multiple formats", t => {
  let map = new EleventyExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getGlobs(), ["./**/*.njk", "./**/*.pug"]);
  t.deepEqual(map.getGlobs("src"), ["./src/**/*.njk", "./src/**/*.pug"]);
});

test("Invalid keys are filtered", t => {
  let map = new EleventyExtensionMap(["lksdjfjlsk"]);
  map.setConfig({
    passthroughFileCopy: false
  });
  t.deepEqual(map.getGlobs(), []);
});

test("Invalid keys are filtered", t => {
  let map = new EleventyExtensionMap(["lksdjfjlsk"]);
  map.setConfig({
    passthroughFileCopy: true
  });
  t.deepEqual(map.getGlobs(), ["./**/*.lksdjfjlsk"]);
});

test("Keys are mapped to lower case", t => {
  let map = new EleventyExtensionMap(["PUG", "NJK"]);
  t.deepEqual(map.getGlobs(), ["./**/*.pug", "./**/*.njk"]);
});

test("Pruned globs", t => {
  let map = new EleventyExtensionMap(["pug", "njk", "png"]);
  t.deepEqual(map.getPrunedGlobs(), ["./**/*.png"]);
});

test("Empty path for fileList", t => {
  let map = new EleventyExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList(), []);
});

test("fileList", t => {
  let map = new EleventyExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList("filename"), ["filename.njk", "filename.pug"]);
});

test("fileList with dir", t => {
  let map = new EleventyExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList("filename", "_includes"), [
    "_includes/filename.njk",
    "_includes/filename.pug"
  ]);
});

test("fileList with dir in path", t => {
  let map = new EleventyExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList("layouts/filename"), [
    "layouts/filename.njk",
    "layouts/filename.pug"
  ]);
});

test("fileList with dir in path and dir", t => {
  let map = new EleventyExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList("layouts/filename", "_includes"), [
    "_includes/layouts/filename.njk",
    "_includes/layouts/filename.pug"
  ]);
});

test("removeTemplateExtension", t => {
  t.is(
    EleventyExtensionMap.removeTemplateExtension("component.njk"),
    "component"
  );
  t.is(
    EleventyExtensionMap.removeTemplateExtension("component.11ty.js"),
    "component"
  );

  t.is(EleventyExtensionMap.removeTemplateExtension(""), "");
  t.is(EleventyExtensionMap.removeTemplateExtension("component"), "component");
  t.is(
    EleventyExtensionMap.removeTemplateExtension("component.js"),
    "component.js"
  );
});
