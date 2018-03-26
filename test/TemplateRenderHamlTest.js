import test from "ava";
import TemplateRender from "../src/TemplateRender";

// Haml
test("Haml", t => {
  t.is(new TemplateRender("haml").getEngineName(), "haml");
});

test("Haml Render", async t => {
  let fn = await new TemplateRender("haml").getCompiledTemplate("%p= name");
  t.is((await fn({ name: "Zach" })).trim(), "<p>Zach</p>");
});

test("Haml Render: with Library Override", async t => {
  let tr = new TemplateRender("haml");

  let lib = require("hamljs");
  tr.engine.setLibrary(lib);

  let fn = await tr.getCompiledTemplate("%p= name");
  t.is((await fn({ name: "Zach" })).trim(), "<p>Zach</p>");
});
