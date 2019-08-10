import test from "ava";
import EleventyExtensionMap from "../src/EleventyExtensionMap";

test("Empty formats", t => {
  let map = new EleventyExtensionMap([]);
  t.deepEqual(map.getGlobs("."), []);
});
test("Single format", t => {
  let map = new EleventyExtensionMap(["pug"]);
  t.deepEqual(map.getGlobs("."), ["./**/*.pug"]);
  t.deepEqual(map.getGlobs("src"), ["./src/**/*.pug"]);
});
test("Multiple formats", t => {
  let map = new EleventyExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getGlobs("."), ["./**/*.njk", "./**/*.pug"]);
  t.deepEqual(map.getGlobs("src"), ["./src/**/*.njk", "./src/**/*.pug"]);
});

test("Invalid keys are filtered (no passthrough copy)", t => {
  let map = new EleventyExtensionMap(["lksdjfjlsk"]);
  map.config = {
    passthroughFileCopy: false
  };
  t.deepEqual(map.getGlobs("."), []);
});

test("Invalid keys are filtered (using passthrough copy)", t => {
  let map = new EleventyExtensionMap(["lksdjfjlsk"]);
  map.config = {
    passthroughFileCopy: true
  };
  t.deepEqual(map.getGlobs("."), ["./**/*.lksdjfjlsk"]);
});

test("Keys are mapped to lower case", t => {
  let map = new EleventyExtensionMap(["PUG", "NJK"]);
  t.deepEqual(map.getGlobs("."), ["./**/*.pug", "./**/*.njk"]);
});

test("Pruned globs", t => {
  let map = new EleventyExtensionMap(["pug", "njk", "png"]);
  t.deepEqual(map.getPrunedGlobs("."), ["./**/*.png"]);
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

test("getKey", t => {
  t.is(EleventyExtensionMap.getKey("component.njk"), "njk");
  t.is(EleventyExtensionMap.getKey("component.11ty.js"), "11ty.js");
  t.is(EleventyExtensionMap.getKey("11ty.js"), "11ty.js");
  t.is(EleventyExtensionMap.getKey(".11ty.js"), "11ty.js");

  t.is(EleventyExtensionMap.getKey("sample.md"), "md");

  t.is(EleventyExtensionMap.getKey(""), undefined);
  t.is(EleventyExtensionMap.getKey("js"), undefined);
  t.is(EleventyExtensionMap.getKey("component"), undefined);
  t.is(EleventyExtensionMap.getKey("component.js"), undefined);
});

test("Extension aliasing (one format key)", t => {
  let map = new EleventyExtensionMap(["md"]);
  map.config = {
    templateExtensionAliases: {
      markdown: "md",
      nunjucks: "njk" // N/A to current format list
    }
  };
  t.deepEqual(map.getExtensionsFromKey("md"), ["md", "markdown"]);
  t.deepEqual(map.getExtensionsFromKey("njk"), ["njk", "nunjucks"]);

  // should filter out N/A aliases
  t.deepEqual(map.getGlobs("."), ["./**/*.md", "./**/*.markdown"]);
});

test("Extension aliasing (two format keys)", t => {
  let map = new EleventyExtensionMap(["md", "njk"]);
  map.config = {
    templateExtensionAliases: {
      markdown: "md",
      nunjucks: "njk"
    }
  };
  t.deepEqual(map.getExtensionsFromKey("md"), ["md", "markdown"]);
  t.deepEqual(map.getExtensionsFromKey("njk"), ["njk", "nunjucks"]);

  t.deepEqual(map.getGlobs("."), [
    "./**/*.md",
    "./**/*.markdown",
    "./**/*.njk",
    "./**/*.nunjucks"
  ]);
});
