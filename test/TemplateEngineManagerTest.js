import test from "ava";
import TemplateEngineManager from "../src/TemplateEngineManager.js";
import TemplateConfig from "../src/TemplateConfig.js";

test("Unsupported engine", async (t) => {
  t.throws(() => {
    let config = new TemplateConfig().getConfig();
    let tem = new TemplateEngineManager(config);
    await tem.getEngine("doesnotexist");
  });
});

test("Supported engine", async (t) => {
  let config = new TemplateConfig().getConfig();
  let tem = new TemplateEngineManager(config);
  t.truthy(tem.hasEngine("ejs"));
});

test("Supported custom engine", async (t) => {
  let config = new TemplateConfig().getConfig();
  let tem = new TemplateEngineManager(config);
  tem.config = Object.assign({}, config);
  tem.config.extensionMap.add({
    extension: "txt",
    key: "txt",
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  t.truthy(tem.hasEngine("txt"));
  let engine = await tem.getEngine("txt");
  let fn = await engine.compile("<p>This is plaintext</p>");
  t.is(await fn({ author: "zach" }), "<p>This is plaintext</p>");
});

test("Custom engine with custom init", async (t) => {
  let initCount = 0;
  let compileCount = 0;
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "custom1",
    key: "custom1",
    init: async function () {
      // do custom things, but only once
      initCount++;
    },
    compile: function (str, inputPath) {
      compileCount++;
      return () => str;
    },
  });

  let config = eleventyConfig.getConfig();
  let tem = new TemplateEngineManager(config);

  t.truthy(tem.hasEngine("custom1"));
  let engine = await tem.getEngine("custom1");
  let fn = await engine.compile("<p>This is plaintext</p>");
  t.is(await fn({}), "<p>This is plaintext</p>");

  let engine2 = await tem.getEngine("custom1");
  t.is(engine, engine2);

  let fn2 = await engine2.compile("<p>This is plaintext</p>");
  t.is(await fn2({}), "<p>This is plaintext</p>");

  t.is(initCount, 1, "Should have only run the init callback once");
  t.is(compileCount, 2, "Should have only run the compile callback twice");
});

test("Handlebars Helpers", async (t) => {
  let config = new TemplateConfig().getConfig();
  let tem = new TemplateEngineManager(config);
  let engine = await tem.getEngine("hbs");
  engine.addHelpers({
    uppercase: function (name) {
      return name.toUpperCase();
    },
  });

  let fn = await engine.compile("<p>{{uppercase author}}</p>");
  t.is(await fn({ author: "zach" }), "<p>ZACH</p>");
});

test("getEngineLib", async (t) => {
  let config = new TemplateConfig().getConfig();
  let tem = new TemplateEngineManager(config);
  t.truthy(await tem.getEngine("md").getEngineLib());
});
