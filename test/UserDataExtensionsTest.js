import test from "ava";
import TemplateData from "../src/TemplateData";
let yaml = require("js-yaml");

function injectDataExtensions(dataObj) {
  dataObj.config.dataExtensions = new Map([
    ["yaml", s => yaml.safeLoad(s)],
    ["nosj", JSON.parse]
  ]);
}

test("Local data", async t => {
  let dataObj = new TemplateData("./test/stubs-630/");
  injectDataExtensions(dataObj);

  let data = await dataObj.getData();

  // YAML GLOBAL DATA
  t.is(data.globalData2.datakey1, "datavalue2");
  t.is(data.globalData2.datakey2, "@11ty/eleventy--yaml");

  // NOSJ (JSON) GLOBAL DATA
  t.is(data.globalData3.datakey1, "datavalue3");
  t.is(data.globalData3.datakey2, "@11ty/eleventy--nosj");

  let withLocalData = await dataObj.getLocalData(
    "./test/stubs-630/component-yaml/component.njk"
  );
  // console.log("localdata", withLocalData);

  t.is(withLocalData.yamlKey1, "yaml1");
  t.is(withLocalData.yamlKey2, "yaml2");
  t.is(withLocalData.yamlKey3, "yaml3");
  t.is(withLocalData.nosjKey1, "nosj1");
  t.is(withLocalData.jsonKey1, "json1");
  t.is(withLocalData.jsonKey2, "json2");
  t.is(withLocalData.jsKey1, "js1");
});

test("Local files", async t => {
  let dataObj = new TemplateData("./test/stubs-630/");
  injectDataExtensions(dataObj);
  let files = await dataObj.getLocalDataPaths(
    "./test/stubs-630/component-yaml/component.njk"
  );
  t.deepEqual(files, [
    "./test/stubs-630/component-yaml/component-yaml.yaml",
    "./test/stubs-630/component-yaml/component-yaml.nosj",
    "./test/stubs-630/component-yaml/component-yaml.json",
    "./test/stubs-630/component-yaml/component-yaml.11tydata.yaml",
    "./test/stubs-630/component-yaml/component-yaml.11tydata.nosj",
    "./test/stubs-630/component-yaml/component-yaml.11tydata.json",
    "./test/stubs-630/component-yaml/component-yaml.11tydata.js",
    "./test/stubs-630/component-yaml/component.yaml",
    "./test/stubs-630/component-yaml/component.nosj",
    "./test/stubs-630/component-yaml/component.json",
    "./test/stubs-630/component-yaml/component.11tydata.yaml",
    "./test/stubs-630/component-yaml/component.11tydata.nosj",
    "./test/stubs-630/component-yaml/component.11tydata.json",
    "./test/stubs-630/component-yaml/component.11tydata.js"
  ]);
});

test("Global data", async t => {
  let dataObj = new TemplateData("./test/stubs-630/");

  injectDataExtensions(dataObj);

  t.deepEqual(await dataObj.getGlobalDataGlob(), [
    "./test/stubs-630/_data/**/*.(nosj|yaml|json|js)"
  ]);

  let dataFilePaths = await dataObj.getGlobalDataFiles();
  let data = await dataObj.getData();

  // JS GLOBAL DATA
  t.is(data.globalData0.datakey1, "datavalue0");

  // JSON GLOBAL DATA
  t.is(data.globalData1.datakey1, "datavalue1");
  t.is(data.globalData1.datakey2, "@11ty/eleventy--json");

  // YAML GLOBAL DATA
  t.is(data.globalData2.datakey1, "datavalue2");
  t.is(data.globalData2.datakey2, "@11ty/eleventy--yaml");

  // NOSJ (JSON) GLOBAL DATA
  t.is(data.globalData3.datakey1, "datavalue3");
  t.is(data.globalData3.datakey2, "@11ty/eleventy--nosj");

  t.is(data.subdir.globalDataSubdir.keyyaml, "yaml");
});
