const test = require("ava");
const fs = require("fs-extra");
const TemplatePassthroughManager = require("../src/TemplatePassthroughManager");
const TemplateConfig = require("../src/TemplateConfig");

test("Get paths from Config", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    img: true,
  };
  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getConfigPaths(), [{ inputPath: "./img", outputPath: true }]);
});

test("isPassthroughCopyFile", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    img: true,
    fonts: true,
  };
  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.true(mgr.isPassthroughCopyFile([], "./img/test.png"));
  t.true(mgr.isPassthroughCopyFile([], "./fonts/Roboto.woff"));
  t.false(mgr.isPassthroughCopyFile([], "./docs/test.njk"));
  t.false(mgr.isPassthroughCopyFile([], "./other-dir/test.png"));
  t.true(
    mgr.isPassthroughCopyFile(
      ["hi", "./other-dir/test.png"],
      "./other-dir/test.png"
    )
  );
});

test("Get glob paths from config", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    "test/stubs/img": true,
    "test/stubs/img/**": "./",
    "test/stubs/img/*.js": "./",
  };
  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getConfigPathGlobs(), [
    "./test/stubs/img/**",
    "./test/stubs/img/**",
    "./test/stubs/img/*.js",
  ]);
});

test("Get file paths", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getNonTemplatePaths(["test.png"]), ["test.png"]);
});

test("Get file paths (filter out real templates)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getNonTemplatePaths(["test.njk"]), []);
});

test("Get file paths (filter out real templates), multiple", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getNonTemplatePaths(["test.njk", "test.png"]), ["test.png"]);
});

test("Get file paths with a js file (filter out real templates), multiple", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getNonTemplatePaths(["test.njk", "test.js"]), ["test.js"]);
});

// This test used to be for passthroughFileCopy: false in config
test("Get file paths (one image path)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let mgr = new TemplatePassthroughManager(eleventyConfig);

  t.deepEqual(mgr.getNonTemplatePaths(["test.png"]), ["test.png"]);
});

test("Naughty paths outside of project dir", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    "../static": true,
    "../*": "./",
    "./test/stubs/template-passthrough2/static/*.css": "./",
    "./test/stubs/template-passthrough2/static/*.js": "../../",
    "./test/stubs/template-passthrough2/img.jpg": "../../",
  };

  let mgr = new TemplatePassthroughManager(eleventyConfig);

  await t.throwsAsync(async function () {
    for (let path of mgr.getConfigPaths()) {
      await mgr.copyPath(path);
    }
  });

  const output = [
    "./test/stubs/template-passthrough2/_site/static",
    "./test/stubs/template-passthrough2/_site/nope.txt",
    "./test/stubs/template-passthrough2/_site/nope/",
    "./test/stubs/test.js",
    "./test/stubs/img.jpg",
  ];

  let results = await Promise.all(
    output.map(function (path) {
      return fs.exists(path);
    })
  );

  for (let result of results) {
    t.false(result);
  }
});
