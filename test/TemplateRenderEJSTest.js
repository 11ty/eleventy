import test from "ava";
import TemplateRender from "../src/TemplateRender";
import path from "path";

// EJS
test("EJS", t => {
  t.is(new TemplateRender("ejs").getEngineName(), "ejs");
});

test("EJS Render", async t => {
  let fn = await new TemplateRender("ejs").getCompiledTemplate(
    "<p><%= name %></p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("EJS Render Include Preprocessor Directive", async t => {
  t.is(path.resolve(undefined, "/included"), "/included");

  let fn = await new TemplateRender("ejs", "./test/stubs/").getCompiledTemplate(
    "<p><% include /included %></p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Include, New Style no Data", async t => {
  let fn = await new TemplateRender("ejs", "./test/stubs/").getCompiledTemplate(
    "<p><%- include('/included') %></p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Include, New Style", async t => {
  let fn = await new TemplateRender("ejs", "./test/stubs/").getCompiledTemplate(
    "<p><%- include('/included', {}) %></p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Include, New Style with Data", async t => {
  let fn = await new TemplateRender("ejs", "./test/stubs/").getCompiledTemplate(
    "<p><%- include('/includedvar', { name: 'Bill' }) %></p>"
  );
  t.is(await fn(), "<p>This is an Bill.</p>");
});

// test("EJS Render Include Preprocessor Directive Relative", async t => {

//   let fn = await new TemplateRender("ejs", "./test/stubs/").getCompiledTemplate(
//     "<p><% include included %></p>"
//   );
//   t.is(await fn(), "<p>This is an include.</p>");
// });

// test("EJS Render Include, Relative Path New Style", async t => {
//   let fn = await new TemplateRender("ejs", "./test/stubs/").getCompiledTemplate(
//     "<p><%- include('stubs/includedrelative', {}) %></p>"
//   );

//   t.is(await fn(), "<p>This is a relative include.</p>");
// });
