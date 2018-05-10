import test from "ava";
import TemplateRender from "../src/TemplateRender";

test("JS", t => {
  t.is(new TemplateRender("js").getEngineName(), "js");
  t.is(new TemplateRender("./test/stubs/filename.js").getEngineName(), "js");
});

test("JS Render", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/template-literal.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render with a Class", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/class-template-literal.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render using Vue", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/vue.js"
  ).getCompiledTemplate();
  t.is(
    await fn({ name: "Zach" }),
    '<p data-server-rendered="true">Hello Zach, this is a Vue template.</p>'
  );
  t.is(
    await fn({ name: "Bill" }),
    '<p data-server-rendered="true">Hello Bill, this is a Vue template.</p>'
  );
});

test("JS Render using Vue (with a layout)", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/vue-layout.js"
  ).getCompiledTemplate();
  t.is(
    await fn({ name: "Zach" }),
    `<!doctype html>
<title>Test</title>
<p data-server-rendered="true">Hello Zach, this is a Vue template.</p>`
  );
});

test("JS Render using ViperHTML", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/viperhtml.js"
  ).getCompiledTemplate();
  t.is(
    await fn({ name: "Zach", html: "<strong>Hi</strong>" }),
    `<div>
  This is a viper template, Zach
  <strong>Hi</strong>
</div>`
  );
});
