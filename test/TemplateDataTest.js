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
