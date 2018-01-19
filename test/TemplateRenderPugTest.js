import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

// Pug
test("Pug", t => {
  t.is(new TemplateRender("pug").getEngineName(), "pug");
});

test("Pug Render", async t => {
  let fn = await new TemplateRender("pug").getCompiledTemplate("p= name");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Pug Render Include", async t => {
  let fn = await new TemplateRender("pug", "./test/stubs/")
    .getCompiledTemplate(`p
	include /included.pug`);
  t.is(await fn({ name: "Zach" }), "<p><span>This is an include.</span></p>");
});

test("Pug Render Include with Data", async t => {
  let fn = await new TemplateRender("pug", "./test/stubs/")
    .getCompiledTemplate(`p
	include /includedvar.pug`);
  t.is(await fn({ name: "Zach" }), "<p><span>This is Zach.</span></p>");
});

test("Pug Render Include with Data, inline var overrides data", async t => {
  let fn = await new TemplateRender("pug", "./test/stubs/")
    .getCompiledTemplate(`
- var name = "Bill";
p
	include /includedvar.pug`);
  t.is(await fn({ name: "Zach" }), "<p><span>This is Bill.</span></p>");
});

test("Pug Render Extends (Layouts)", async t => {
  let fn = await new TemplateRender("pug", "./test/stubs/")
    .getCompiledTemplate(`extends /layout.pug
block content
  h1= name`);
  t.is(await fn({ name: "Zach" }), "<html><body><h1>Zach</h1></body></html>");
});
