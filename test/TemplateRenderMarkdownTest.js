import test from "ava";
import TemplateRender from "../src/TemplateRender";
import md from "markdown-it";
import mdEmoji from "markdown-it-emoji";

// Markdown
test("Markdown", t => {
  t.is(new TemplateRender("md").getEngineName(), "md");
});

test("Markdown Render: Parses base markdown, no data", async t => {
  let fn = await new TemplateRender("md").getCompiledTemplate("# My Title");
  t.is((await fn()).trim(), "<h1>My Title</h1>");
});

test("Markdown Render: Markdown should work with HTML too", async t => {
  let fn = await new TemplateRender("md").getCompiledTemplate(
    "<h1>My Title</h1>"
  );
  t.is((await fn()).trim(), "<h1>My Title</h1>");
});

test("Markdown Render: Parses markdown using liquid engine (default, with data)", async t => {
  let fn = await new TemplateRender("md").getCompiledTemplate("# {{title}}");
  t.is((await fn({ title: "My Title" })).trim(), "<h1>My Title</h1>");
});

test("Markdown Render: Parses markdown using ejs engine", async t => {
  let tr = new TemplateRender("md");
  tr.setMarkdownEngine("ejs");
  let fn = await tr.getCompiledTemplate("<%=title %>");
  t.is((await fn({ title: "My Title" })).trim(), "<p>My Title</p>");
});

test("Markdown Render: Ignore markdown, use only preprocess engine (useful for variable resolution in permalinks)", async t => {
  let tr = new TemplateRender("md");
  tr.setUseMarkdown(false);
  let fn = await tr.getCompiledTemplate("{{title}}");
  t.is((await fn({ title: "My Title" })).trim(), "My Title");
});

test("Markdown Render: Set markdown engine to false, don’t parse", async t => {
  let tr = new TemplateRender("md");
  tr.setMarkdownEngine(false);
  let fn = await tr.getCompiledTemplate("# {{title}}");
  t.is((await fn()).trim(), "<h1>{{title}}</h1>");
});

test("Markdown Render: Set markdown engine to false, don’t parse (test with HTML input)", async t => {
  let tr = new TemplateRender("md");
  tr.setMarkdownEngine(false);
  let fn = await tr.getCompiledTemplate("<h1>{{title}}</h1>");

  t.is((await fn()).trim(), "<h1>{{title}}</h1>");
});

test("Markdown Render: Pass in engine override (ejs)", async t => {
  let tr = new TemplateRender("md");
  tr.setMarkdownEngine("ejs");
  let fn = await tr.getCompiledTemplate("# <%= title %>");
  t.is((await fn({ title: "My Title" })).trim(), "<h1>My Title</h1>");
});

test("Markdown Render: Pass in an override (liquid)", async t => {
  let tr = new TemplateRender("md");
  tr.setMarkdownEngine("liquid");
  let fn = await tr.getCompiledTemplate("# {{title}}");

  t.is((await fn({ title: "My Title" })).trim(), "<h1>My Title</h1>");
});

test("Markdown Render: Strikethrough", async t => {
  let fn = await new TemplateRender("md").getCompiledTemplate("~~No~~");
  t.is((await fn()).trim(), "<p><s>No</s></p>");
});

test("Markdown Render: Strikethrough in a Header", async t => {
  let fn = await new TemplateRender("md").getCompiledTemplate("# ~~No~~");
  t.is((await fn()).trim(), "<h1><s>No</s></h1>");
});

test("Markdown Render: with Library Override", async t => {
  let tr = new TemplateRender("md");

  let mdLib = md();
  tr.engine.setLibrary(mdLib);
  t.is(mdLib.render(":)").trim(), "<p>:)</p>");

  let fn = await tr.getCompiledTemplate(":)");
  t.is((await fn()).trim(), "<p>:)</p>");
});

test("Markdown Render: with Library Override and a Plugin", async t => {
  let tr = new TemplateRender("md");

  let mdLib = md().use(mdEmoji);
  tr.engine.setLibrary(mdLib);
  t.is(mdLib.render(":)").trim(), "<p>😃</p>");

  let fn = await tr.getCompiledTemplate(":)");
  t.is((await fn()).trim(), "<p>😃</p>");
});
