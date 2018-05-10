import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

test("JS", t => {
  t.is(new TemplateRender("js").getEngineName(), "js");
  t.is(new TemplateRender("./test/stubs/filename.js").getEngineName(), "js");
});

test("JS Render", async t => {
  let fn = await new TemplateRender("../../test/stubs/filename.js").getCompiledTemplate(
    "<p>${data.name}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});
