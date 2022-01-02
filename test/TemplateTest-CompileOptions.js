const test = require("ava");

const TemplateConfig = require("../src/TemplateConfig");
const TemplateData = require("../src/TemplateData");

const getNewTemplate = require("./_getNewTemplateForTests");

test("Custom extension (.txt) with custom permalink compile function", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
      // pass in your own custom permalink function.
      permalink: async function (permalinkString, inputPath) {
        t.is(permalinkString, "custom-extension.lit");
        t.is(inputPath, "./test/stubs/custom-extension.txt");
        return async function () {
          return "HAHA_THIS_ALWAYS_GOES_HERE.txt";
        };
      },
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
  t.is(await tmpl.render(data), "Sample content");
  t.deepEqual(await tmpl.getOutputLocations(data), {
    href: "/HAHA_THIS_ALWAYS_GOES_HERE.txt",
    path: "dist/HAHA_THIS_ALWAYS_GOES_HERE.txt",
    rawPath: "HAHA_THIS_ALWAYS_GOES_HERE.txt",
  });
});

test("Custom extension with and compileOptions.permalink = false", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
      permalink: false,
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
  t.is(await tmpl.render(data), "Sample content");
  t.deepEqual(await tmpl.getOutputLocations(data), {
    href: false,
    path: false,
    rawPath: false,
  });
});

test("Custom extension with and opt-out of permalink compilation", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
      permalink: "raw",
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
  t.is(await tmpl.render(data), "Sample content");
  t.deepEqual(await tmpl.getOutputLocations(data), {
    href: "/custom-extension.lit",
    path: "dist/custom-extension.lit",
    rawPath: "custom-extension.lit",
  });
});

test("Custom extension (.txt) with custom permalink compile function but no permalink in the data cascade", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
      // pass in your own custom permalink function.
      permalink: async function (permalinkString, inputPath) {
        t.is(permalinkString, undefined);
        t.is(inputPath, "./test/stubs/custom-extension-no-permalink.txt");

        return async function () {
          return "HAHA_THIS_ALWAYS_GOES_HERE.txt";
        };
      },
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
    "./test/stubs/custom-extension-no-permalink.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(await tmpl.render(data), "Sample content");
  t.deepEqual(await tmpl.getOutputLocations(data), {
    href: "/HAHA_THIS_ALWAYS_GOES_HERE.txt",
    path: "dist/HAHA_THIS_ALWAYS_GOES_HERE.txt",
    rawPath: "HAHA_THIS_ALWAYS_GOES_HERE.txt",
  });
});

test("Custom extension (.txt) with custom permalink compile function (that returns a string not a function) but no permalink in the data cascade", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
      permalink: async function (permalinkString, inputPath) {
        t.is(permalinkString, undefined);
        t.is(inputPath, "./test/stubs/custom-extension-no-permalink.txt");

        // unique part of this test: this is a string, not a function
        return "HAHA_THIS_ALWAYS_GOES_HERE.txt";
      },
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
    "./test/stubs/custom-extension-no-permalink.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(await tmpl.render(data), "Sample content");
  t.deepEqual(await tmpl.getOutputLocations(data), {
    href: "/HAHA_THIS_ALWAYS_GOES_HERE.txt",
    path: "dist/HAHA_THIS_ALWAYS_GOES_HERE.txt",
    rawPath: "HAHA_THIS_ALWAYS_GOES_HERE.txt",
  });
});

test("Custom extension (.txt) with custom permalink compile function that returns false", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
      permalink: async function (permalinkString, inputPath) {
        t.is(permalinkString, undefined);
        t.is(inputPath, "./test/stubs/custom-extension-no-permalink.txt");

        // unique part of this test: this returns false
        return false;
      },
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
    "./test/stubs/custom-extension-no-permalink.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(await tmpl.render(data), "Sample content");
  t.deepEqual(await tmpl.getOutputLocations(data), {
    href: false,
    path: false,
    rawPath: false,
  });
});

test("Custom extension (.txt) that returns undefined from compile", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compileOptions: {
      cache: false,
    },
    compile: function (str, inputPath) {
      t.is(str, "Sample content");
      return function (data) {
        return undefined;
      };
    },
  });

  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/custom-extension-no-permalink.txt",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(await tmpl.render(data), undefined);
  let pages = await tmpl.getTemplates(data);
  for (let page of pages) {
    page.templateContent = undefined;
    t.is(page.templateContent, undefined); // shouldn’t throw an error
  }
});
