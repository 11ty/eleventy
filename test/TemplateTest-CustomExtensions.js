const test = require("ava");

const TemplateConfig = require("../src/TemplateConfig");
const TemplateData = require("../src/TemplateData");
const TemplateContent = require("../src/TemplateContent");

const getNewTemplate = require("./_getNewTemplateForTests");

test("Using getData: false without getInstanceFromInputPath works ok", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
    },
    getData: false,
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/custom-extension.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(await tmpl.render(data), "Sample content");
});

test("Using getData: true without getInstanceFromInputPath should error", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
    },
    getData: true,
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/custom-extension.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  await t.throwsAsync(async () => {
    await tmpl.getData();
  });
});

test("Using getData: [] without getInstanceFromInputPath should error", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
    },
    getData: [],
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/custom-extension.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  await t.throwsAsync(async () => {
    await tmpl.getData();
  });
});

test("Using getData: true and getInstanceFromInputPath to get data from instance", async (t) => {
  let globalData = {
    topLevelData: true,
  };

  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
    },
    getData: true,
    getInstanceFromInputPath: function () {
      return {
        data: globalData,
      };
    },
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/custom-extension.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(data.topLevelData, true);
});

test("Using eleventyDataKey to get a different key data from instance", async (t) => {
  let globalData = {
    topLevelData: true,
  };

  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
    },
    getData: [],
    getInstanceFromInputPath: function () {
      return {
        eleventyDataKey: ["otherProp"],
        otherProp: globalData,
      };
    },
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/custom-extension.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(data.topLevelData, true);
});
