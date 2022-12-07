const test = require("ava");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const TemplateConfig = require("../src/TemplateConfig");

function getExtensionMap(formats, config = new TemplateConfig()) {
  let map = new EleventyExtensionMap(formats, config);
  return map;
}

test("Empty formats", (t) => {
  let map = getExtensionMap([]);
  t.deepEqual(map.getGlobs("."), []);
});
test("Single format", (t) => {
  let map = getExtensionMap(["pug"]);
  t.deepEqual(map.getGlobs("."), ["./**/*.pug"]);
  t.deepEqual(map.getGlobs("src"), ["./src/**/*.pug"]);
});
test("Multiple formats", (t) => {
  let map = getExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getGlobs("."), ["./**/*.njk", "./**/*.pug"]);
  t.deepEqual(map.getGlobs("src"), ["./src/**/*.njk", "./src/**/*.pug"]);
});

test("Invalid keys are filtered (using passthrough copy)", (t) => {
  let map = getExtensionMap(["lksdjfjlsk"]);
  t.deepEqual(map.getGlobs("."), ["./**/*.lksdjfjlsk"]);
});

test("Keys are mapped to lower case", (t) => {
  let map = getExtensionMap(["PUG", "NJK"]);
  t.deepEqual(map.getGlobs("."), ["./**/*.pug", "./**/*.njk"]);
});

test("Pruned globs", (t) => {
  let map = getExtensionMap(["pug", "njk", "png"]);
  t.deepEqual(map.getPassthroughCopyGlobs("."), ["./**/*.png"]);
});

test("Empty path for fileList", (t) => {
  let map = getExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList(), []);
});

test("fileList", (t) => {
  let map = getExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList("filename"), ["filename.njk", "filename.pug"]);
});

test("fileList with dir", (t) => {
  let map = getExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList("filename", "_includes"), [
    "_includes/filename.njk",
    "_includes/filename.pug",
  ]);
});

test("fileList with dir in path", (t) => {
  let map = getExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList("layouts/filename"), [
    "layouts/filename.njk",
    "layouts/filename.pug",
  ]);
});

test("fileList with dir in path and dir", (t) => {
  let map = getExtensionMap(["njk", "pug"]);
  t.deepEqual(map.getFileList("layouts/filename", "_includes"), [
    "_includes/layouts/filename.njk",
    "_includes/layouts/filename.pug",
  ]);
});

test("removeTemplateExtension", (t) => {
  let map = getExtensionMap(["njk", "11ty.js"]);
  t.is(map.removeTemplateExtension("component.njk"), "component");
  t.is(map.removeTemplateExtension("component.11ty.js"), "component");

  t.is(map.removeTemplateExtension(""), "");
  t.is(map.removeTemplateExtension("component"), "component");
  t.is(map.removeTemplateExtension("component.js"), "component.js");
});

test("hasEngine", (t) => {
  let map = getExtensionMap(["liquid", "njk", "11ty.js", "ejs", "pug"]);
  t.true(map.hasEngine("default.ejs"));
  t.is(map.getKey("default.ejs"), "ejs");
  t.falsy(map.getKey());
  t.is(map.getKey("EjS"), "ejs");
  t.true(map.hasEngine("EjS"));
  t.true(map.hasEngine("ejs"));
  t.falsy(map.getKey("sldkjfkldsj"));
  t.false(map.hasEngine("sldkjfkldsj"));

  t.is(map.getKey("11ty.js"), "11ty.js");
  t.true(map.hasEngine("11ty.js"));

  t.is(map.getKey("md"), "md");
  t.true(map.hasEngine("md"));
});

test("hasEngine no formats passed in", (t) => {
  let map = getExtensionMap([]);
  t.true(map.hasEngine("default.ejs"));
  t.is(map.getKey("default.ejs"), "ejs");
  t.falsy(map.getKey());
  t.is(map.getKey("EjS"), "ejs");
  t.true(map.hasEngine("EjS"));
  t.true(map.hasEngine("ejs"));
  t.falsy(map.getKey("sldkjfkldsj"));
  t.false(map.hasEngine("sldkjfkldsj"));

  // should return keys for engines that exist but are not filtered
  t.is(map.getKey("11ty.js"), "11ty.js");
  t.true(map.hasEngine("11ty.js"));

  t.is(map.getKey("md"), "md");
  t.true(map.hasEngine("md"));
});

test("getKey", (t) => {
  let map = getExtensionMap(["njk", "11ty.js", "md"]);
  t.is(map.getKey("component.njk"), "njk");
  t.is(map.getKey("component.11ty.js"), "11ty.js");
  t.is(map.getKey("11ty.js"), "11ty.js");
  t.is(map.getKey(".11ty.js"), "11ty.js");

  t.is(map.getKey("sample.md"), "md");

  t.is(map.getKey(""), undefined);
  t.is(map.getKey("js"), undefined);
  t.is(map.getKey("component"), undefined);
  t.is(map.getKey("component.js"), undefined);
});

test("isFullTemplateFilePath (not a passthrough copy extension)", (t) => {
  let map = getExtensionMap([
    "liquid",
    "njk",
    "11ty.js",
    "ejs",
    "pug",
    "js",
    "css",
  ]);
  t.true(map.isFullTemplateFilePath("template.liquid"));
  t.true(map.isFullTemplateFilePath("template.njk"));
  t.true(map.isFullTemplateFilePath("template.11ty.js"));
  t.true(map.isFullTemplateFilePath("template.ejs"));
  t.true(map.isFullTemplateFilePath("template.pug"));
  t.false(map.isFullTemplateFilePath("passthrough.js"));
  t.false(map.isFullTemplateFilePath("passthrough.css"));
});

test("getValidExtensionsForPath", (t) => {
  let cfg = new TemplateConfig();
  cfg.userConfig.extensionMap.add({
    key: "js",
    extension: "js",
  });

  let map = getExtensionMap(["liquid", "njk", "11ty.js", "js"], cfg);

  t.deepEqual(map.getValidExtensionsForPath("template.liquid"), ["liquid"]);
  t.deepEqual(map.getValidExtensionsForPath("template.11ty.js"), [
    "11ty.js",
    "js",
  ]);
  t.deepEqual(map.getValidExtensionsForPath("template.pug"), []);
  t.deepEqual(map.getValidExtensionsForPath("template.liquid.js"), ["js"]);
  t.deepEqual(map.getValidExtensionsForPath("njk.liquid.11ty.js"), [
    "11ty.js",
    "js",
  ]);
});

test("shouldSpiderJavaScriptDependencies", (t) => {
  let cfg = new TemplateConfig();
  cfg.userConfig.extensionMap.add({
    key: "js",
    extension: "js",
  });

  let map = getExtensionMap(["liquid", "njk", "11ty.js", "js"], cfg);

  t.deepEqual(map.shouldSpiderJavaScriptDependencies("template.liquid"), false);
  t.deepEqual(map.shouldSpiderJavaScriptDependencies("template.njk"), false);
  t.deepEqual(map.shouldSpiderJavaScriptDependencies("template.css"), false);
  t.deepEqual(map.shouldSpiderJavaScriptDependencies("template.11ty.js"), true);
  t.deepEqual(map.shouldSpiderJavaScriptDependencies("template.js"), false);
});
