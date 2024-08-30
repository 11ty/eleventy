import test from "ava";
import fs from "fs";
import { rimrafSync } from "rimraf";

import TemplatePassthroughManager from "../src/TemplatePassthroughManager.js";
import TemplateConfig from "../src/TemplateConfig.js";
import FileSystemSearch from "../src/FileSystemSearch.js";
import EleventyFiles from "../src/EleventyFiles.js";
import EleventyExtensionMap from "../src/EleventyExtensionMap.js";

import { getTemplateConfigInstance, getTemplateConfigInstanceCustomCallback } from "./_testHelpers.js";

test("Get paths from Config", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    img: { outputPath: true },
  };
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getConfigPaths(), [{ inputPath: "./img", outputPath: true, copyOptions: {} }]);
});

test("isPassthroughCopyFile", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    img: { outputPath: true },
    fonts: { outputPath: true },
  };
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.false(mgr.isPassthroughCopyFile([]));
  t.false(mgr.isPassthroughCopyFile([], ""));
  t.false(mgr.isPassthroughCopyFile([], null));

  t.truthy(mgr.isPassthroughCopyFile([], "./img/test.png"));
  t.deepEqual(mgr.isPassthroughCopyFile([], "./img/test.png"), {
    inputPath: "./img",
    outputPath: true,
    copyOptions: {},
  });

  t.truthy(mgr.isPassthroughCopyFile([], "./fonts/Roboto.woff"));
  t.deepEqual(mgr.isPassthroughCopyFile([], "./fonts/Roboto.woff"), {
    inputPath: "./fonts",
    outputPath: true,
    copyOptions: {},
  });

  t.false(mgr.isPassthroughCopyFile([], "./docs/test.njk"));
  t.false(mgr.isPassthroughCopyFile([], "./other-dir/test.png"));
  t.true(mgr.isPassthroughCopyFile(["hi", "./other-dir/test.png"], "./other-dir/test.png"));
});

test("Get glob paths from config", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    "test/stubs/img": { outputPath: true },
    "test/stubs/img/**": { outputPath: "./" },
    "test/stubs/img/*.js": { outputPath: "./" },
  };
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getConfigPathGlobs(), [
    "./test/stubs/img/**",
    "./test/stubs/img/**",
    "./test/stubs/img/*.js",
  ]);
});

test("Get file paths", async (t) => {
  let eleventyConfig = new TemplateConfig();
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getNonTemplatePaths(["test.png"]), ["test.png"]);
});

test("Get file paths (filter out real templates)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  mgr.extensionMap = new EleventyExtensionMap(eleventyConfig);
  mgr.extensionMap.setFormats(["njk"]);

  t.deepEqual(mgr.getNonTemplatePaths(["test.njk"]), []);
});

test("Get file paths (filter out real templates), multiple", async (t) => {
  let eleventyConfig = new TemplateConfig();
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  mgr.extensionMap = new EleventyExtensionMap(eleventyConfig);
  mgr.extensionMap.setFormats(["njk"]);

  t.deepEqual(mgr.getNonTemplatePaths(["test.njk", "test.png"]), ["test.png"]);
});

test("Get file paths with a js file (filter out real templates), multiple", async (t) => {
  let eleventyConfig = new TemplateConfig();
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  mgr.extensionMap = new EleventyExtensionMap(eleventyConfig);
  mgr.extensionMap.setFormats(["njk"]);

  t.deepEqual(mgr.getNonTemplatePaths(["test.njk", "test.js"]), ["test.js"]);
});

// This test used to be for passthroughFileCopy: false in config
test("Get file paths (one image path)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getNonTemplatePaths(["test.png"]), ["test.png"]);
});

test("Naughty paths outside of project dir", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    "../static": { outputPath: true },
    "../*": { outputPath: "./" },
    "./test/stubs/template-passthrough2/static/*.css": { outputPath: "./" },
    "./test/stubs/template-passthrough2/static/*.js": { outputPath: "../../" },
    "./test/stubs/template-passthrough2/img.jpg": { outputPath: "../../" },
  };
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);

  await t.throwsAsync(async function () {
    for (let path of mgr.getConfigPaths()) {
      let pass = mgr.getTemplatePassthroughForPath(path);
      await mgr.copyPassthrough(pass);
    }
  });

  const output = [
    "./test/stubs/template-passthrough2/_site/static",
    "./test/stubs/template-passthrough2/_site/nope.txt",
    "./test/stubs/template-passthrough2/_site/nope/",
    "./test/stubs/test.js",
    "./test/stubs/img.jpg",
  ];

  for (let path of output) {
    t.false(fs.existsSync(path));
  }
});

test("getAllNormalizedPaths", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    img: { outputPath: true },
  };
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  t.deepEqual(mgr.getAllNormalizedPaths(), [
    { inputPath: "./img", outputPath: true, copyOptions: {} },
  ]);
});

test("getAllNormalizedPaths with globs", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    img: { outputPath: true },
    "img/**": { outputPath: "./" },
    "img/*.js": { outputPath: "./" },
  };
  await eleventyConfig.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  t.deepEqual(mgr.getAllNormalizedPaths(), [
    { inputPath: "./img", outputPath: true, copyOptions: {} },
    { inputPath: "./img/**", outputPath: "", copyOptions: {} },
    { inputPath: "./img/*.js", outputPath: "", copyOptions: {} },
  ]);
});

test("getAliasesFromPassthroughResults with Unicode filenames", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  let results = [
    { map: { "./path/file": "_site/path/file" } },
    { map: { "./测试.用例/⌘": "_site/测试.用例/⌘" } },
    { map: { "./path/测试.用例": "_site/path/测试.用例" } },
    { map: { "./测试.用例/file": "_site/测试.用例/file" } },
  ]
  t.deepEqual(mgr.getAliasesFromPassthroughResults(results), {
    "/path/file": "./path/file",
    "/%E6%B5%8B%E8%AF%95.%E7%94%A8%E4%BE%8B/%E2%8C%98": "./测试.用例/⌘",
    "/path/%E6%B5%8B%E8%AF%95.%E7%94%A8%E4%BE%8B": "./path/测试.用例",
    "/%E6%B5%8B%E8%AF%95.%E7%94%A8%E4%BE%8B/file": "./测试.用例/file",
  });
});

test("Look for uniqueness on template passthrough paths #1677", async (t) => {
  let formats = [];

  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs/template-passthrough-duplicates",
    output: "test/stubs/template-passthrough-duplicates/_site"
  }, function(cfg) {
    cfg.passthroughCopies = {
      "./test/stubs/template-passthrough-duplicates/**/*.png": {
        outputPath: "./",
      },
    };
  });

  let files = new EleventyFiles(formats, eleventyConfig);
  files.setFileSystemSearch(new FileSystemSearch());
  files.init();

  let mgr = files.getPassthroughManager();
  await t.throwsAsync(async function () {
    await mgr.copyAll();
  });

  rimrafSync("test/stubs/template-passthrough-duplicates/_site/");
});
