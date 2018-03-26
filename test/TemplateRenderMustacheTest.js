import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

// Mustache
test("Mustache", async t => {
  t.is(new TemplateRender("mustache").getEngineName(), "mustache");
});

test("Mustache Render", async t => {
  let fn = await new TemplateRender("mustache").getCompiledTemplate(
    "<p>{{name}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Mustache Render Partial", async t => {
  let fn = await new TemplateRender(
    "mustache",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{{> included}}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Mustache Render Partial", async t => {
  let fn = await new TemplateRender(
    "mustache",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{{> includedvar}}</p>");
  t.is(await fn({ name: "Zach" }), "<p>This is a Zach.</p>");
});

test("Mustache Render: with Library Override", async t => {
  let tr = new TemplateRender("mustache");

  let lib = require("mustache");
  tr.engine.setLibrary(lib);

  let fn = await tr.getCompiledTemplate("<p>{{name}}</p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});
