import test from "ava";
import fs from "fs-extra";
import TemplatePassthroughManager from "../src/TemplatePassthroughManager";

test("Get paths from Config", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: true,
    passthroughCopies: {
      img: true
    }
  });

  t.deepEqual(mgr.getConfigPaths(), [{ inputPath: "./img", outputPath: true }]);
});

test("Empty config paths when disabled in config", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: false,
    passthroughCopies: {
      img: true
    }
  });

  t.deepEqual(mgr.getConfigPaths(), []);
});

test("Get glob paths from config", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: true,
    passthroughCopies: {
      "test/stubs/img": true,
      "test/stubs/img/**": "./",
      "test/stubs/img/*.js": "./"
    }
  });

  t.deepEqual(mgr.getConfigPathGlobs(), [
    "./test/stubs/img/**",
    "./test/stubs/img/**",
    "./test/stubs/img/*.js"
  ]);
});

test("Get file paths", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: true
  });

  t.deepEqual(mgr.getFilePaths(["test.png"]), ["test.png"]);
});

test("Get file paths (filter out real templates)", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: true
  });

  t.deepEqual(mgr.getFilePaths(["test.njk"]), []);
});

test("Get file paths (filter out real templates), multiple", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: true
  });

  t.deepEqual(mgr.getFilePaths(["test.njk", "test.png"]), ["test.png"]);
});

test("Get file paths with a js file (filter out real templates), multiple", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: true
  });

  t.deepEqual(mgr.getFilePaths(["test.njk", "test.js"]), ["test.js"]);
});

test("Get file paths when disabled in config", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: false
  });

  t.deepEqual(mgr.getFilePaths(["test.png"]), []);
});

test("Naughty paths outside of project dir", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: true,
    passthroughCopies: {
      "../static": true,
      "../*": "./",
      "./test/stubs/template-passthrough2/static/*.css": "./",
      "./test/stubs/template-passthrough2/static/*.js": "../../",
      "./test/stubs/template-passthrough2/img.jpg": "../../"
    }
  });

  await t.throwsAsync(async function() {
    for (let path of mgr.getConfigPaths()) {
      await mgr.copyPath(path);
    }
  });

  const output = [
    "./test/stubs/template-passthrough2/_site/static",
    "./test/stubs/template-passthrough2/_site/nope.txt",
    "./test/stubs/template-passthrough2/_site/nope/",
    "./test/stubs/test.js",
    "./test/stubs/img.jpg"
  ];

  let results = await Promise.all(
    output.map(function(path) {
      return fs.exists(path);
    })
  );

  for (let result of results) {
    t.false(result);
  }
});
