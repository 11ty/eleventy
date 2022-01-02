const test = require("ava");

const TemplateConfig = require("../src/TemplateConfig");
const TemplateData = require("../src/TemplateData");
const TemplateContent = require("../src/TemplateContent");

const getNewTemplate = require("./_getNewTemplateForTests");

test("Custom extension using getData: false", async (t) => {
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
