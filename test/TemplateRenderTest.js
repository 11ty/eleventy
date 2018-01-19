import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

test(t => {
  // Path is unnecessary but supported
  t.is(TemplateRender.cleanupEngineName("default.ejs"), "ejs");
  t.true(TemplateRender.hasEngine("default.ejs"));
  t.is(new TemplateRender("default.ejs").getEngineName(), "ejs");

  // Better
  t.is(TemplateRender.cleanupEngineName("ejs"), "ejs");
  t.is(TemplateRender.cleanupEngineName("EjS"), "ejs");
  t.true(TemplateRender.hasEngine("EjS"));
  t.true(TemplateRender.hasEngine("ejs"));
  t.is(new TemplateRender("ejs").getEngineName(), "ejs");

  t.is(TemplateRender.cleanupEngineName("sldkjfkldsj"), "sldkjfkldsj");
  t.false(TemplateRender.hasEngine("sldkjfkldsj"));
});

test("Input Dir", async t => {
  t.is(
    new TemplateRender("ejs", "./test/stubs").getInputDir(),
    "test/stubs/_includes"
  );
});
