import test from "ava";
import TemplateRender from "../src/TemplateRender";

// Handlebars
test("Handlebars", t => {
  t.is(new TemplateRender("hbs").getEngineName(), "hbs");
});

test("Handlebars Render", async t => {
  let fn = await new TemplateRender("hbs").getCompiledTemplate(
    "<p>{{name}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Handlebars Render Unescaped Output (no HTML)", async t => {
  let fn = await new TemplateRender("hbs").getCompiledTemplate(
    "<p>{{{name}}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Handlebars Render Escaped Output", async t => {
  let fn = await new TemplateRender("hbs").getCompiledTemplate(
    "<p>{{name}}</p>"
  );
  t.is(await fn({ name: "<b>Zach</b>" }), "<p>&lt;b&gt;Zach&lt;/b&gt;</p>");
});

test("Handlebars Render Unescaped Output (HTML)", async t => {
  let fn = await new TemplateRender("hbs").getCompiledTemplate(
    "<p>{{{name}}}</p>"
  );
  t.is(await fn({ name: "<b>Zach</b>" }), "<p><b>Zach</b></p>");
});

test("Handlebars Render Partial", async t => {
  let fn = await new TemplateRender("hbs", "./test/stubs/").getCompiledTemplate(
    "<p>{{> included}}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Handlebars Render Partial", async t => {
  let fn = await new TemplateRender("hbs", "./test/stubs/").getCompiledTemplate(
    "<p>{{> includedvar}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>This is a Zach.</p>");
});

test("Handlebars Render: with Library Override", async t => {
  let tr = new TemplateRender("hbs");

  let lib = require("handlebars");
  tr.engine.setLibrary(lib);

  let fn = await tr.getCompiledTemplate("<p>{{name}}</p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});
