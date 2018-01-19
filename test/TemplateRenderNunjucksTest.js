import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

// Nunjucks
test("Nunjucks", t => {
  t.is(new TemplateRender("njk").getEngineName(), "njk");
});

test("Nunjucks Render", async t => {
  let fn = await new TemplateRender("njk").getCompiledTemplate(
    "<p>{{ name }}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Nunjucks Render Extends", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "{% extends 'base.njk' %}{% block content %}This is a child.{% endblock %}"
  );
  t.is(await fn(), "<p>This is a child.</p>");
});

test("Nunjucks Render Include", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "<p>{% include 'included.njk' %}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Nunjucks Render Imports", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "{% import 'imports.njk' as forms %}<div>{{ forms.label('Name') }}</div>"
  );
  t.is(await fn(), "<div><label>Name</label></div>");
});

test("Nunjucks Render Imports From", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "{% from 'imports.njk' import label %}<div>{{ label('Name') }}</div>"
  );
  t.is(await fn(), "<div><label>Name</label></div>");
});
