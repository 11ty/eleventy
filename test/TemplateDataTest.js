import test from "ava";
import semver from "semver";
import { createRequire } from "module";

import TemplateData from "../src/Data/TemplateData.js";
import FileSystemSearch from "../src/FileSystemSearch.js";

import { getTemplateConfigInstance, getTemplateConfigInstanceCustomCallback } from "./_testHelpers.js";

const pkg = createRequire(import.meta.url)("../package.json");

async function testGetLocalData(tmplData, templatePath) {
  let localDataPaths = await tmplData.getLocalDataPaths(templatePath);
  let importedData = await tmplData.combineLocalData(localDataPaths);
  let globalData = await tmplData.getGlobalData();

  // OK-ish: shallow merge when combining template/data dir files with global data files
  let localData = Object.assign({}, globalData, importedData);
  // debug("`getLocalData` for %o: %O", templatePath, localData);
  return localData;
}

test("Create", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  })

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();

  t.true(Object.keys(data[eleventyConfig.getConfig().keys.package]).length > 0);
});

test("getGlobalData()", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let config = eleventyConfig.getConfig();
  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  t.is(dataObj.getGlobalData().toString(), "[object Promise]");

  let data = await dataObj.getGlobalData();
  t.is(data.globalData.datakey1, "datavalue1", "simple data value");
  t.is(
    data.globalData.datakey2,
    "{{pkg.name}}",
    `variables, resolve ${config.keys.package} to its value.`
  );

  t.true(
    Object.keys(data[config.keys.package]).length > 0,
    `package.json imported to data in ${config.keys.package}`
  );
});

test("getGlobalData() use default processing (false)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  t.is(data.globalData.datakey2, "{{pkg.name}}", `variables should not resolve`);
});

test("Data dir does not exist", async (t) => {
  await t.throwsAsync(async () => {
    let eleventyConfig = await getTemplateConfigInstance({
      dir: {
        input: "test/thisdirectorydoesnotexist"
      }
    });
    let dataObj = new TemplateData(eleventyConfig);
    dataObj.setProjectUsingEsm(true);
    await dataObj.getGlobalData();
  }, {
    message: "The \"test/thisdirectorydoesnotexist\" `input` parameter (directory or file path) must exist on the file system (unless detected as a glob by the `is-glob` package)"
  });
});

test("Add local data", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();

  t.is(data.globalData.datakey1, "datavalue1");
  t.is(data.globalData.datakey2, "{{pkg.name}}");

  let withLocalData = await testGetLocalData(dataObj, "./test/stubs/component/component.njk");
  t.is(withLocalData.globalData.datakey1, "datavalue1");
  t.is(withLocalData.globalData.datakey2, "{{pkg.name}}");
  t.is(withLocalData.localdatakey1, "localdatavalue1");

  // from the js file
  // this checks priority/overrides
  t.is(withLocalData.localdatakeyfromcjs, "common-js-howdydoody");
  t.is(withLocalData.localdatakeyfromjs, "howdydoody");
  t.is(withLocalData.localdatakeyfromjs2, "howdy2");
});

test("Get local data async JS", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let withLocalData = await testGetLocalData(dataObj, "./test/stubs/component-async/component.njk");

  // from the js file
  t.is(withLocalData.localdatakeyfromjs, "howdydoody");
  t.is(withLocalData.localdatakeyfromcjs, "common-js-howdydoody");
});

test("addLocalData() doesn’t exist but doesn’t fail (template file does exist)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  let beforeDataKeyCount = Object.keys(data);

  // template file does exist
  let withLocalData = await testGetLocalData(
    dataObj,
    "./test/stubs/datafiledoesnotexist/template.njk"
  );
  t.is(withLocalData.globalData.datakey1, "datavalue1");
  t.is(withLocalData.globalData.datakey2, "{{pkg.name}}");
  t.deepEqual(Object.keys(withLocalData), beforeDataKeyCount);
});

test("addLocalData() doesn’t exist but doesn’t fail (template file does not exist)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  let beforeDataKeyCount = Object.keys(data);

  let withLocalData = await testGetLocalData(
    dataObj,
    "./test/stubs/datafiledoesnotexist/templatedoesnotexist.njk"
  );
  t.is(withLocalData.globalData.datakey1, "datavalue1");
  t.is(withLocalData.globalData.datakey2, "{{pkg.name}}");
  t.deepEqual(Object.keys(withLocalData), beforeDataKeyCount);
});

test("Global Dir Directory", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "."
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);

  t.deepEqual(dataObj.getGlobalDataGlob(), ["./_data/**/*.{json,mjs,cjs,js}"]);
});

test("Global Dir Directory with Constructor Path Arg", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);

  t.deepEqual(dataObj.getGlobalDataGlob(), ["./test/stubs/_data/**/*.{json,mjs,cjs,js}"]);
});

test("getAllGlobalData() with other data files", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  let dataFilePaths = await dataObj.getGlobalDataFiles();

  t.true(dataFilePaths.length > 0);
  t.true(
    dataFilePaths.filter((path) => {
      return path.indexOf("./test/stubs/_data/globalData.json") === 0;
    }).length > 0
  );

  t.truthy(data.globalData);
  t.is(data.globalData.datakey1, "datavalue1");

  t.truthy(data.testData);
  t.deepEqual(data.testData, {
    testdatakey1: "testdatavalue1",
  });
  t.deepEqual(data.subdir.testDataSubdir, {
    subdirkey: "subdirvalue",
  });
});

test("getAllGlobalData() with js object data file", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  let dataFilePaths = await dataObj.getGlobalDataFiles();

  t.true(
    dataFilePaths.filter((path) => {
      return path.indexOf("./test/stubs/_data/globalData2.cjs") === 0;
    }).length > 0
  );

  t.truthy(data.globalData2);
  t.is(data.globalData2.datakeyfromjs, "howdy");
});

test("getAllGlobalData() with js function data file", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  let dataFilePaths = await dataObj.getGlobalDataFiles();

  t.true(
    dataFilePaths.filter((path) => {
      return path.indexOf("./test/stubs/_data/globalDataFn.js") === 0;
    }).length > 0
  );

  t.truthy(data.globalDataFn);
  t.is(data.globalDataFn.datakeyfromjsfn, "howdy");
});

test("getAllGlobalData() with config globalData", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs"
  }, function(cfg) {
    cfg.addGlobalData("example", () => "one");
    cfg.addGlobalData("example2", async () => "two");
    cfg.addGlobalData("example3", "static");
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();

  t.is(data.example, "one");
  t.is(data.example2, "two");
  t.is(data.example3, "static");
});

test("getAllGlobalData() with common js function data file", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  let dataFilePaths = await dataObj.getGlobalDataFiles();

  t.true(
    dataFilePaths.filter((path) => {
      return path.indexOf("./test/stubs/_data/globalDataFnCJS.cjs") === 0;
    }).length > 0
  );

  t.truthy(data.globalDataFnCJS);
  t.is(data.globalDataFnCJS.datakeyfromcjsfn, "common-cjs-howdy");
});

test("getDataValue() without template engine preprocessing", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);

  let data = await dataObj.getDataValue("./test/stubs/_data/testDataLiquid.json", {
    pkg: { name: "pkgname" },
  });

  t.deepEqual(data, {
    datakey1: "datavalue1",
    datakey2: "{{ pkg.name }}",
  });
});

test("getLocalDataPaths", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.mjs",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",

    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.mjs",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths (with setDataFileBaseName #1699)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs"
  }, function(cfg) {
    cfg.setDataFileBaseName("index");
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/stubs/index.11tydata.json",
    "./test/stubs/index.11tydata.mjs",
    "./test/stubs/index.11tydata.cjs",
    "./test/stubs/index.11tydata.js",

    "./test/stubs/component/index.11tydata.json",
    "./test/stubs/component/index.11tydata.mjs",
    "./test/stubs/component/index.11tydata.cjs",
    "./test/stubs/component/index.11tydata.js",

    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.mjs",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths (with empty setDataFileSuffixes #1699)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs"
  }, function(cfg) {
    cfg.setDataFileSuffixes([]);
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, []);
});

test("getLocalDataPaths (with setDataFileSuffixes override #1699)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs"
  }, function(cfg) {
    cfg.setDataFileSuffixes([".howdy"]);
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/stubs/stubs.howdy.json",
    "./test/stubs/stubs.howdy.mjs",
    "./test/stubs/stubs.howdy.cjs",
    "./test/stubs/stubs.howdy.js",

    "./test/stubs/component/component.howdy.json",
    "./test/stubs/component/component.howdy.mjs",
    "./test/stubs/component/component.howdy.cjs",
    "./test/stubs/component/component.howdy.js",
  ]);
});

test("getLocalDataPaths (with setDataFileSuffixes empty string override #1699)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs"
  }, function(cfg) {
    cfg.setDataFileSuffixes([""]);
  });


  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, ["./test/stubs/stubs.json", "./test/stubs/component/component.json"]);
});

test("getLocalDataPaths (with setDataFileSuffixes override with two entries #1699)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs"
  }, function(cfg) {
    cfg.setDataFileSuffixes([".howdy", ""]);
  });


  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.howdy.json",
    "./test/stubs/stubs.howdy.mjs",
    "./test/stubs/stubs.howdy.cjs",
    "./test/stubs/stubs.howdy.js",

    "./test/stubs/component/component.json",
    "./test/stubs/component/component.howdy.json",
    "./test/stubs/component/component.howdy.mjs",
    "./test/stubs/component/component.howdy.cjs",
    "./test/stubs/component/component.howdy.js",
  ]);
});

test("getLocalDataPaths (with setDataFileSuffixes and setDataFileBaseName #1699)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs"
  }, function(cfg) {
    cfg.setDataFileBaseName("index");
    cfg.setDataFileSuffixes([".howdy", ""]);
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/stubs/index.howdy.json",
    "./test/stubs/index.howdy.mjs",
    "./test/stubs/index.howdy.cjs",
    "./test/stubs/index.howdy.js",

    "./test/stubs/component/index.howdy.json",
    "./test/stubs/component/index.howdy.mjs",
    "./test/stubs/component/index.howdy.cjs",
    "./test/stubs/component/index.howdy.js",

    "./test/stubs/component/component.json",
    "./test/stubs/component/component.howdy.json",
    "./test/stubs/component/component.howdy.mjs",
    "./test/stubs/component/component.howdy.cjs",
    "./test/stubs/component/component.howdy.js",
  ]);
});

test("Deeper getLocalDataPaths", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance();

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/test.json",
    "./test/test.11tydata.json",
    "./test/test.11tydata.mjs",
    "./test/test.11tydata.cjs",
    "./test/test.11tydata.js",
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.mjs",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.mjs",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths with an 11ty js template", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.11ty.js");

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.mjs",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.mjs",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths with inputDir passed in (trailing slash)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.mjs",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.mjs",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths with inputDir passed in (no trailing slash)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.mjs",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.mjs",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths with inputDir passed in (no leading slash)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let paths = await dataObj.getLocalDataPaths("./test/stubs/component/component.liquid");

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.mjs",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.mjs",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getRawImports", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  let data = await dataObj.getRawImports();

  t.is(data.pkg.name, "@11ty/eleventy");
});

test("getTemplateDataFileGlob", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let tw = new TemplateData(eleventyConfig);

  t.deepEqual(await tw.getTemplateDataFileGlob(), [
    "./test/stubs/**/*.{json,11tydata.mjs,11tydata.cjs,11tydata.js}",
  ]);
});

test("TemplateData.merge", (t) => {
  t.deepEqual(
    TemplateData.merge(
      {
        tags: [1, 2, 3],
      },
      {
        tags: [4, 5, 6],
      }
    ),
    { tags: [1, 2, 3, 4, 5, 6] }
  );
});

test("TemplateData.cleanupData", (t) => {
  t.deepEqual(TemplateData.cleanupData({}), {});
  t.deepEqual(TemplateData.cleanupData({ tags: null }), { tags: [] });
  t.deepEqual(TemplateData.cleanupData({ tags: "" }), { tags: [] });
  t.deepEqual(TemplateData.cleanupData({ tags: [] }), { tags: [] });
  t.deepEqual(TemplateData.cleanupData({ tags: "test" }), { tags: ["test"] });
  t.deepEqual(TemplateData.cleanupData({ tags: ["test1", "test2"] }), {
    tags: ["test1", "test2"],
  });
});

test("Parent directory for data (Issue #337)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs-337/src/",
      data: "../data/",
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();

  t.deepEqual(data.xyz, {
    hi: "bye",
  });
});

test("Dots in datafile path (Issue #1242)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs-1242/",
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();

  t.deepEqual(data["xyz.dottest"], {
    hi: "bye",
    test: {
      abc: 42,
    },
  });
});

test("addGlobalData values", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "./test/stubs-global-data-config-api/"
  }, function(cfg) {
    cfg.addGlobalData("myFunction", () => "fn-value");
    cfg.addGlobalData("myPromise", () => {
      return new Promise((resolve) => {
        setTimeout(resolve, 100, "promise-value");
      });
    });
    cfg.addGlobalData("myAsync", async () => Promise.resolve("promise-value"));
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());
  let data = await dataObj.getGlobalData();

  t.is(data.myFunction, "fn-value");
  t.is(data.myPromise, "promise-value");
  t.is(data.myAsync, "promise-value");
});

test("addGlobalData should execute once.", async (t) => {
  let count = 0;

  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "./test/stubs-global-data-config-api/"
  }, function(cfg) {
    cfg.addGlobalData("count", () => {
      count++;
      return count;
    });
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();

  t.is(data.count, 1);
  t.is(count, 1);
});

test("addGlobalData complex key", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "./test/stubs-global-data-config-api-nested/"
  }, function(cfg) {
    cfg.addGlobalData("deep.nested.one", () => "first");
    cfg.addGlobalData("deep.nested.two", () => "second");
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());
  let data = await dataObj.getGlobalData();

  t.is(data.deep.existing, true);
  t.is(data.deep.nested.one, "first");
  t.is(data.deep.nested.two, "second");
});

test("eleventy.version and eleventy.generator returned from data", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "./test/stubs-empty/"
  }, function(cfg) {
    cfg.addGlobalData("deep.nested.one", () => "first");
    cfg.addGlobalData("deep.nested.two", () => "second");
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());
  let data = await dataObj.getGlobalData();

  let version = semver.coerce(pkg.version).toString();

  t.is(data.eleventy.version, version);
  t.is(data.eleventy.generator, `Eleventy v${version}`);

  t.is(data.deep.nested.one, "first");
  t.is(data.deep.nested.two, "second");
});

test("getGlobalData() empty json file", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs-empty-json-data/",
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);

  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  t.deepEqual(data.empty, {});
});

test("ESM data file", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs-data-esm/",
    }
  });

  let dataObj = new TemplateData(eleventyConfig);
  dataObj.setProjectUsingEsm(true);
  dataObj.setFileSystemSearch(new FileSystemSearch());

  let data = await dataObj.getGlobalData();
  t.is(data.module.default, "es module default");
  t.is(data.module.named, "es module named");
  t.is(data.commonjs, "commonjs default");
});
