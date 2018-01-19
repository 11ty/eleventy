import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

// HTML
test("HTML", t => {
  t.is(new TemplateRender("html").getEngineName(), "html");
});

test("HTML Render", async t => {
  let fn = await new TemplateRender("html").getCompiledTemplate(
    "<p>Paragraph</p>"
  );
  t.is(await fn(), "<p>Paragraph</p>");
  t.is(await fn({}), "<p>Paragraph</p>");
});

test("HTML Render: Parses HTML using liquid engine (default, with data)", async t => {
  let fn = await new TemplateRender("html").getCompiledTemplate(
    "<h1>{{title}}</h1>"
  );
  t.is((await fn({ title: "My Title" })).trim(), "<h1>My Title</h1>");
});

test("HTML Render: Parses HTML using ejs engine", async t => {
  let fn = await new TemplateRender("html").getCompiledTemplate(
    "<h1><%=title %></h1>",
    {
      parseHtmlWith: "ejs"
    }
  );
  t.is((await fn({ title: "My Title" })).trim(), "<h1>My Title</h1>");
});

test("HTML Render: Set HTML engine to false, don’t parse", async t => {
  let fn = await new TemplateRender("html").getCompiledTemplate(
    "<h1>{{title}}</h1>",
    {
      parseHtmlWith: false
    }
  );
  t.is((await fn()).trim(), "<h1>{{title}}</h1>");
});

test("HTML Render: Pass in an override (ejs)", async t => {
  let tr = new TemplateRender("html");

  let fn = await tr.getCompiledTemplate("<h1><%= title %></h1>", {
    parseHtmlWith: "ejs"
  });
  t.is((await fn({ title: "My Title" })).trim(), "<h1>My Title</h1>");
});

test("HTML Render: Pass in an override (liquid)", async t => {
  let tr = new TemplateRender("html");

  let fn = await tr.getCompiledTemplate("<h1>{{title}}</h1>", {
    parseHtmlWith: "liquid"
  });

  t.is((await fn({ title: "My Title" })).trim(), "<h1>My Title</h1>");
});
