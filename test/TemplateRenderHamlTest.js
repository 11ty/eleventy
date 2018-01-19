import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

// Haml
test("Haml", t => {
  t.is(new TemplateRender("haml").getEngineName(), "haml");
});

test("Haml Render", async t => {
  let fn = await new TemplateRender("haml").getCompiledTemplate("%p= name");
  t.is((await fn({ name: "Zach" })).trim(), "<p>Zach</p>");
});
