import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

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
