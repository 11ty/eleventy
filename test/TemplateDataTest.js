import test from "ava";
import TemplateData from "../src/TemplateData";
import TemplateConfig from "../src/TemplateConfig";

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();

test("Create", async t => {
  let dataObj = new TemplateData("./test/stubs/globalData.json");
  let data = await dataObj.getData();

  t.true(Object.keys(data[cfg.keys.package]).length > 0);
});

test("getData()", async t => {
  let dataObj = new TemplateData("./test/stubs/globalData.json");

  t.is(dataObj.getData().toString(), "[object Promise]");

  let globalData = await dataObj.getData();
  t.is(globalData.datakey1, "datavalue1", "simple data value");
  t.is(
    globalData.datakey2,
    "eleventy",
    `variables, resolve ${cfg.keys.package} to its value.`
  );

  t.true(
    Object.keys(globalData[cfg.keys.package]).length > 0,
    `package.json imported to data in ${cfg.keys.package}`
  );
});

test("getJson()", async t => {
  let dataObj = new TemplateData("./test/stubs/globalData.json");

  let data = await dataObj.getJson(dataObj.globalDataPath, dataObj.rawImports);

  t.is(data.datakey1, "datavalue1");
  t.is(data.datakey2, "eleventy");
});

test("getJson() file does not exist", async t => {
  let dataObj = new TemplateData("./test/stubs/thisfiledoesnotexist.json");

  let data = await dataObj.getJson(dataObj.globalDataPath, dataObj.rawImports);

  t.is(typeof data, "object");
  t.is(Object.keys(data).length, 0);
});

test("addLocalData()", async t => {
  let dataObj = new TemplateData("./test/stubs/globalData.json");
  let data = await dataObj.cacheData();

  t.is(data.datakey1, "datavalue1");
  t.is(data.datakey2, "eleventy");

  let withLocalData = await dataObj.getLocalData(
    "./test/stubs/component/component.json"
  );
  t.is(withLocalData.datakey1, "datavalue1");
  t.is(withLocalData.datakey2, "eleventy");
  t.is(withLocalData.component.localdatakey1, "localdatavalue1");
});

test("addLocalData() doesn’t exist but doesn’t fail", async t => {
  let dataObj = new TemplateData("./test/stubs/globalData.json");
  let data = await dataObj.cacheData();

  let withLocalData = await dataObj.getLocalData(
    "./test/stubs/component/thisfiledoesnotexist.json"
  );
  t.is(withLocalData.datakey1, "datavalue1");
  t.is(withLocalData.datakey2, "eleventy");
  t.deepEqual(withLocalData.thisfiledoesnotexist, {});
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
});
