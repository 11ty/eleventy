import test from "ava";
import TemplateData from "../src/TemplateData";
import TemplateConfig from "../src/TemplateConfig";

let cfg = TemplateConfig.getDefaultConfig();

test("Create", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let data = await dataObj.getData();

  t.true(Object.keys(data[cfg.keys.package]).length > 0);
});

// test("Create (old method, file name not dir)", async t => {
//   let dataObj = new TemplateData("./test/stubs/globalData.json");
//   let data = await dataObj.getData();

//   t.true(Object.keys(data[cfg.keys.package]).length > 0);
// });

test("getData()", async t => {
  let dataObj = new TemplateData("./test/stubs/");

  t.is(dataObj.getData().toString(), "[object Promise]");

  let data = await dataObj.getData();
  t.is(data.globalData.datakey1, "datavalue1", "simple data value");
  t.is(
    data.globalData.datakey2,
    "eleventy",
    `variables, resolve ${cfg.keys.package} to its value.`
  );

  t.true(
    Object.keys(data[cfg.keys.package]).length > 0,
    `package.json imported to data in ${cfg.keys.package}`
  );
});

test("Data dir does not exist", async t => {
  let dataObj = new TemplateData("./test/thisdirectorydoesnotexist");

  await t.throws(dataObj.getData());
});

test("addLocalData()", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let data = await dataObj.getData();

  t.is(data.globalData.datakey1, "datavalue1");
  t.is(data.globalData.datakey2, "eleventy");

  let withLocalData = await dataObj.getLocalData(
    "./test/stubs/component/component.json"
  );
  t.is(withLocalData.globalData.datakey1, "datavalue1");
  t.is(withLocalData.globalData.datakey2, "eleventy");
  t.is(withLocalData.localdatakey1, "localdatavalue1");
});

test("addLocalData() doesn’t exist but doesn’t fail", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let data = await dataObj.getData();
  let beforeDataKeyCount = Object.keys(data);

  let withLocalData = await dataObj.getLocalData(
    "./test/stubs/component/thisfiledoesnotexist.json"
  );
  t.is(withLocalData.globalData.datakey1, "datavalue1");
  t.is(withLocalData.globalData.datakey2, "eleventy");
  t.deepEqual(Object.keys(withLocalData), beforeDataKeyCount);
});

test("Global Dir Directory", async t => {
  let dataObj = new TemplateData();

  t.is(await dataObj.getGlobalDataGlob(), "_data/**/*.json");
});

test("Global Dir Directory with Constructor Path Arg", async t => {
  let dataObj = new TemplateData("./test/stubs/");

  t.is(await dataObj.getGlobalDataGlob(), "test/stubs/_data/**/*.json");
});

test("getAllGlobalData() with other data files", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let data = await dataObj.cacheData();

  t.true((await dataObj.getGlobalDataFiles()).length > 0);
  t.not(typeof data.testData, "undefined");

  t.deepEqual(data.testData, {
    testdatakey1: "testdatavalue1"
  });

  t.deepEqual(data.subdir.testDataSubdir, {
    subdirkey: "subdirvalue"
  });
});
