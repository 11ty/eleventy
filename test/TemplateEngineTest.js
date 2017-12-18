import test from "ava";
import TemplateEngine from "../src/Engines/TemplateEngine";

test("Unsupported engine", async t => {
  t.is(new TemplateEngine("doesnotexist").getName(), "doesnotexist");

  t.throws(() => {
    TemplateEngine.getEngine("doesnotexist");
  });
});

test("Handlebars Helpers", async t => {
  let engine = TemplateEngine.getEngine("hbs");
  engine.addHelpers({
    uppercase: function(name) {
      return name.toUpperCase();
    }
  });

  let fn = await engine.compile("<p>{{uppercase author}}</p>");
  t.is(await fn({ author: "zach" }), "<p>ZACH</p>");
});
