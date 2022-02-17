const test = require("ava");
const TemplateData = require("../src/TemplateData");
const TemplateConfig = require("../src/TemplateConfig");

async function testGetLocalData(tmplData, templatePath) {
  let localDataPaths = await tmplData.getLocalDataPaths(templatePath);
  let importedData = await tmplData.combineLocalData(localDataPaths);
  let globalData = await tmplData.getData();

  // OK-ish: shallow merge when combining template/data dir files with global data files
  let localData = Object.assign({}, globalData, importedData);
  // debug("`getLocalData` for %o: %O", templatePath, localData);
  return localData;
}

test("Create", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let config = eleventyConfig.getConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let data = await dataObj.getData();

  t.true(Object.keys(data[config.keys.package]).length > 0);
});

test("getData()", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let config = eleventyConfig.getConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  dataObj.setDataTemplateEngine("liquid");

  t.is(dataObj.getData().toString(), "[object Promise]");

  let data = await dataObj.getData();
  t.is(data.globalData.datakey1, "datavalue1", "simple data value");
  t.is(
    data.globalData.datakey2,
    "@11ty/eleventy",
    `variables, resolve ${config.keys.package} to its value.`
  );

  t.true(
    Object.keys(data[config.keys.package]).length > 0,
    `package.json imported to data in ${config.keys.package}`
  );
});

test("getData() use default processing (false)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let data = await dataObj.getData();
  t.is(
    data.globalData.datakey2,
    "{{pkg.name}}",
    `variables should not resolve`
  );
});

test("Data dir does not exist", async (t) => {
  await t.throwsAsync(async () => {
    let dataObj = new TemplateData("./test/thisdirectorydoesnotexist");
    await dataObj.getData();
  });
});

test("Add local data", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  dataObj.setDataTemplateEngine("liquid");

  let data = await dataObj.getData();

  t.is(data.globalData.datakey1, "datavalue1");
  t.is(data.globalData.datakey2, "@11ty/eleventy");

  let withLocalData = await testGetLocalData(
    dataObj,
    "./test/stubs/component/component.njk"
  );
  t.is(withLocalData.globalData.datakey1, "datavalue1");
  t.is(withLocalData.globalData.datakey2, "@11ty/eleventy");
  t.is(withLocalData.localdatakey1, "localdatavalue1");

  // from the js file
  // this checks priority/overrides
  t.is(withLocalData.localdatakeyfromcjs, "common-js-howdydoody");
  t.is(withLocalData.localdatakeyfromjs, "howdydoody");
  t.is(withLocalData.localdatakeyfromjs2, "howdy2");
});

test("Get local data async JS", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);

  let withLocalData = await testGetLocalData(
    dataObj,
    "./test/stubs/component-async/component.njk"
  );

  // from the js file
  t.is(withLocalData.localdatakeyfromjs, "howdydoody");
  t.is(withLocalData.localdatakeyfromcjs, "common-js-howdydoody");
});

test("addLocalData() doesn’t exist but doesn’t fail (template file does exist)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  dataObj.setDataTemplateEngine("liquid");

  let data = await dataObj.getData();
  let beforeDataKeyCount = Object.keys(data);

  // template file does exist
  let withLocalData = await testGetLocalData(
    dataObj,
    "./test/stubs/datafiledoesnotexist/template.njk"
  );
  t.is(withLocalData.globalData.datakey1, "datavalue1");
  t.is(withLocalData.globalData.datakey2, "@11ty/eleventy");
  t.deepEqual(Object.keys(withLocalData), beforeDataKeyCount);
});

test("addLocalData() doesn’t exist but doesn’t fail (template file does not exist)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  dataObj.setDataTemplateEngine("liquid");

  let data = await dataObj.getData();
  let beforeDataKeyCount = Object.keys(data);

  let withLocalData = await testGetLocalData(
    dataObj,
    "./test/stubs/datafiledoesnotexist/templatedoesnotexist.njk"
  );
  t.is(withLocalData.globalData.datakey1, "datavalue1");
  t.is(withLocalData.globalData.datakey2, "@11ty/eleventy");
  t.deepEqual(Object.keys(withLocalData), beforeDataKeyCount);
});

test("Global Dir Directory", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./", eleventyConfig);

  t.deepEqual(await dataObj.getGlobalDataGlob(), [
    "./_data/**/*.(json|cjs|js)",
  ]);
});

test("Global Dir Directory with Constructor Path Arg", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);

  t.deepEqual(await dataObj.getGlobalDataGlob(), [
    "./test/stubs/_data/**/*.(json|cjs|js)",
  ]);
});

test("getAllGlobalData() with other data files", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let data = await dataObj.cacheData();
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
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let data = await dataObj.cacheData();
  let dataFilePaths = await dataObj.getGlobalDataFiles();

  t.true(
    dataFilePaths.filter((path) => {
      return path.indexOf("./test/stubs/_data/globalData2.js") === 0;
    }).length > 0
  );

  t.truthy(data.globalData2);
  t.is(data.globalData2.datakeyfromjs, "howdy");
});

test("getAllGlobalData() with js function data file", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let data = await dataObj.cacheData();
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
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);

  dataObj._setConfig({
    ...dataObj.config,
    globalData: {
      example: () => {
        return "one";
      },
      example2: async () => {
        return "two";
      },
      example3: "static",
    },
  });

  let data = await dataObj.cacheData(true);

  t.is(data.example, "one");
  t.is(data.example2, "two");
  t.is(data.example3, "static");
});

test("getAllGlobalData() with common js function data file", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let data = await dataObj.cacheData();
  let dataFilePaths = await dataObj.getGlobalDataFiles();

  t.true(
    dataFilePaths.filter((path) => {
      return path.indexOf("./test/stubs/_data/globalDataFnCJS.cjs") === 0;
    }).length > 0
  );

  t.truthy(data.globalDataFnCJS);
  t.is(data.globalDataFnCJS.datakeyfromcjsfn, "common-cjs-howdy");
});

test("getDataValue() without a dataTemplateEngine", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  dataObj.setDataTemplateEngine(false);

  let data = await dataObj.getDataValue("./test/stubs/_data/testDataEjs.json", {
    pkg: { name: "pkgname" },
  });

  t.deepEqual(data, {
    datakey1: "datavalue1",
    datakey2: "<%= pkg.name %>",
  });
});

test("getDataValue() without dataTemplateEngine changed to `ejs`", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  dataObj.setDataTemplateEngine("ejs");

  let data = await dataObj.getDataValue("./test/stubs/_data/testDataEjs.json", {
    pkg: { name: "pkgname" },
  });

  t.deepEqual(data, {
    datakey1: "datavalue1",
    datakey2: "pkgname",
  });
});

test("getLocalDataPaths", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let paths = await dataObj.getLocalDataPaths(
    "./test/stubs/component/component.liquid"
  );

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("Deeper getLocalDataPaths", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./", eleventyConfig);
  let paths = await dataObj.getLocalDataPaths(
    "./test/stubs/component/component.liquid"
  );

  t.deepEqual(paths, [
    "./test/test.json",
    "./test/test.11tydata.json",
    "./test/test.11tydata.cjs",
    "./test/test.11tydata.js",
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths with an 11ty js template", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let paths = await dataObj.getLocalDataPaths(
    "./test/stubs/component/component.11ty.js"
  );

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths with inputDir passed in (trailing slash)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let paths = await dataObj.getLocalDataPaths(
    "./test/stubs/component/component.liquid"
  );

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths with inputDir passed in (no trailing slash)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let paths = await dataObj.getLocalDataPaths(
    "./test/stubs/component/component.liquid"
  );

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getLocalDataPaths with inputDir passed in (no leading slash)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("test/stubs", eleventyConfig);
  let paths = await dataObj.getLocalDataPaths(
    "./test/stubs/component/component.liquid"
  );

  t.deepEqual(paths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
});

test("getRawImports", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("test/stubs", eleventyConfig);
  let data = dataObj.getRawImports();

  t.is(data.pkg.name, "@11ty/eleventy");
});

test("getTemplateDataFileGlob", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let tw = new TemplateData("test/stubs", eleventyConfig);

  t.deepEqual(await tw.getTemplateDataFileGlob(), [
    "./test/stubs/**/*.json",
    "./test/stubs/**/*.11tydata.cjs",
    "./test/stubs/**/*.11tydata.js",
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
  let eleventyConfig = new TemplateConfig({
    dataTemplateEngine: false,
    dir: {
      input: "./test/stubs-337/src/",
      data: "../data/",
    },
  });
  let dataObj = new TemplateData("./test/stubs-337/src/", eleventyConfig);
  dataObj.setInputDir("./test/stubs-337/src/");

  let data = await dataObj.getData();

  t.deepEqual(data, {
    xyz: {
      hi: "bye",
    },
  });
});

test("addGlobalData values", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.addGlobalData("myFunction", () => "fn-value");
  eleventyConfig.userConfig.addGlobalData("myPromise", () => {
    return new Promise((resolve) => {
      setTimeout(resolve, 100, "promise-value");
    });
  });
  eleventyConfig.userConfig.addGlobalData("myAsync", async () =>
    Promise.resolve("promise-value")
  );

  let dataObj = new TemplateData(
    "./test/stubs-global-data-config-api/",
    eleventyConfig
  );
  let data = await dataObj.getData();

  t.is(data.myFunction, "fn-value");
  t.is(data.myPromise, "promise-value");
  t.is(data.myAsync, "promise-value");
});

test("addGlobalData should execute once.", async (t) => {
  let count = 0;
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.addGlobalData("count", () => {
    count++;
    return count;
  });

  let dataObj = new TemplateData(
    "./test/stubs-global-data-config-api/",
    eleventyConfig
  );
  let data = await dataObj.getData();

  t.is(data.count, 1);
  t.is(count, 1);
});

test("addGlobalData complex key", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.addGlobalData("deep.nested.one", () => "first");
  eleventyConfig.userConfig.addGlobalData("deep.nested.two", () => "second");

  let dataObj = new TemplateData(
    "./test/stubs-global-data-config-api-nested/",
    eleventyConfig
  );
  let data = await dataObj.getData();

  t.is(data.deep.existing, true);
  t.is(data.deep.nested.one, "first");
  t.is(data.deep.nested.two, "second");
});
