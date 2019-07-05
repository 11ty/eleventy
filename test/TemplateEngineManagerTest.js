import test from "ava";
import TemplateEngineManager from "../src/TemplateEngineManager";

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
