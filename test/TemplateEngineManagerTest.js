import test from "ava";
import TemplateEngineManager from "../src/TemplateEngineManager";
import templateConfig from "../src/Config";
const config = templateConfig.getConfig();

test("Unsupported engine", async t => {
  t.throws(() => {
    let tem = new TemplateEngineManager();
    tem.getEngine("doesnotexist");
  });
});

test("Supported engine", async t => {
  let tem = new TemplateEngineManager();
  t.truthy(tem.hasEngine("ejs"));
});

test("Supported custom engine", async t => {
  let tem = new TemplateEngineManager();
  tem.config = Object.assign({}, config);
  tem.config.extensionMap.add({
    extension: "txt",
    key: "txt",
    compile: function(str, inputPath) {
      // plaintext
      return function(data) {
        return str;
      };
    }
  });

  t.truthy(tem.hasEngine("txt"));
  let engine = tem.getEngine("txt");
  let fn = await engine.compile("<p>This is plaintext</p>");
  t.is(await fn({ author: "zach" }), "<p>This is plaintext</p>");
});

test("Handlebars Helpers", async t => {
  let tem = new TemplateEngineManager();
  let engine = tem.getEngine("hbs");
  engine.addHelpers({
    uppercase: function(name) {
      return name.toUpperCase();
    }
  });

  let fn = await engine.compile("<p>{{uppercase author}}</p>");
  t.is(await fn({ author: "zach" }), "<p>ZACH</p>");
});

test("getEngineLib", async t => {
  let tem = new TemplateEngineManager();
  t.truthy(tem.getEngine("md").getEngineLib());
});
