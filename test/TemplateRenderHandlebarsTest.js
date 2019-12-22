import test from "ava";
import TemplateRender from "../src/TemplateRender";

// Handlebars
test("Handlebars", t => {
  t.is(new TemplateRender("hbs").getEngineName(), "hbs");
});

test("Handlebars Render", async t => {
  let fn = await new TemplateRender("hbs").getCompiledTemplate(
    "<p>{{name}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Handlebars Render Unescaped Output (no HTML)", async t => {
  let fn = await new TemplateRender("hbs").getCompiledTemplate(
    "<p>{{{name}}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Handlebars Render Escaped Output", async t => {
  let fn = await new TemplateRender("hbs").getCompiledTemplate(
    "<p>{{name}}</p>"
  );
  t.is(await fn({ name: "<b>Zach</b>" }), "<p>&lt;b&gt;Zach&lt;/b&gt;</p>");
});

test("Handlebars Render Unescaped Output (HTML)", async t => {
  let fn = await new TemplateRender("hbs").getCompiledTemplate(
    "<p>{{{name}}}</p>"
  );
  t.is(await fn({ name: "<b>Zach</b>" }), "<p><b>Zach</b></p>");
});

test("Handlebars Render Partial", async t => {
  let fn = await new TemplateRender("hbs", "./test/stubs/").getCompiledTemplate(
    "<p>{{> included}}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test.skip("Handlebars Render Partial (Relative)", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/does_not_exist_and_thats_ok.hbs",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{{> ./included}}</p>");

  // not supported yet.
  t.is(await fn(), "<p>This is an includdde.</p>");
});

test("Handlebars Render Partial (Subdirectory)", async t => {
  let fn = await new TemplateRender("hbs", "./test/stubs/").getCompiledTemplate(
    "<p>{{> subfolder/included}}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Handlebars Render Partial with variable", async t => {
  let fn = await new TemplateRender("hbs", "./test/stubs/").getCompiledTemplate(
    "<p>{{> includedvar}}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>This is a Zach.</p>");
});

test("Handlebars Render: with Library Override", async t => {
  let tr = new TemplateRender("hbs");

  let lib = require("handlebars");
  tr.engine.setLibrary(lib);

  let fn = await tr.getCompiledTemplate("<p>{{name}}</p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Handlebars Render Helper", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addHelpers({
    helpername: function() {
      return "Zach";
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{helpername}} {{name}}.</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>This is a Zach Zach.</p>");
});

test("Handlebars Render Helper (uses argument)", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addHelpers({
    helpername2: function(name) {
      return "Zach";
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{helpername2 name}}.</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>This is a Zach.</p>");
});

test("Handlebars Render Shortcode", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addShortcodes({
    shortcodename: function(name) {
      return name.toUpperCase();
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{shortcodename name}}.</p>"
  );
  t.is(await fn({ name: "Howdy" }), "<p>This is a HOWDY.</p>");
});

test("Handlebars Render HTML in Shortcode (Issue #460)", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addShortcodes({
    shortcodenamehtml: function(name) {
      return `<span>${name.toUpperCase()}</span>`;
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{{shortcodenamehtml name}}}.</p>"
  );
  t.is(await fn({ name: "Howdy" }), "<p>This is a <span>HOWDY</span>.</p>");
});

test("Handlebars Render Shortcode (Multiple args)", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addShortcodes({
    shortcodename2: function(name, name2) {
      return name.toUpperCase() + name2.toUpperCase();
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{shortcodename2 name name2}}.</p>"
  );
  t.is(
    await fn({ name: "Howdy", name2: "Zach" }),
    "<p>This is a HOWDYZACH.</p>"
  );
});

test("Handlebars Render Paired Shortcode", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addPairedShortcodes({
    shortcodename3: function(content, name, options) {
      return (content + name).toUpperCase();
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{#shortcodename3 name}}Testing{{/shortcodename3}}.</p>"
  );
  t.is(await fn({ name: "Howdy" }), "<p>This is a TESTINGHOWDY.</p>");
});

test("Handlebars Render Paired Shortcode (HTML)", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addPairedShortcodes({
    shortcodename3html: function(content, name, options) {
      return `<span>${(content + name).toUpperCase()}</span>`;
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{#shortcodename3html name}}<span>Testing</span>{{/shortcodename3html}}.</p>"
  );
  t.is(
    await fn({ name: "Howdy" }),
    "<p>This is a <span><SPAN>TESTING</SPAN>HOWDY</span>.</p>"
  );
});

test("Handlebars Render Paired Shortcode (Spaces)", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addPairedShortcodes({
    shortcodename4: function(content, name, options) {
      return (content + name).toUpperCase();
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{# shortcodename4 name }}Testing{{/ shortcodename4 }}.</p>"
  );
  t.is(await fn({ name: "Howdy" }), "<p>This is a TESTINGHOWDY.</p>");
});

test("Handlebars Render Paired Shortcode with a Nested Single Shortcode", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addShortcodes({
    shortcodechild: function(txt, options) {
      return txt;
    }
  });

  tr.engine.addPairedShortcodes({
    shortcodeparent: function(content, name, name2, options) {
      return (content + name + name2).toUpperCase();
    }
  });

  let fn = await tr.getCompiledTemplate(
    "<p>This is a {{# shortcodeparent name name2 }}{{shortcodechild 'CHILD CONTENT'}}{{/ shortcodeparent }}.</p>"
  );
  t.is(
    await fn({ name: "Howdy", name2: "Zach" }),
    "<p>This is a CHILD CONTENTHOWDYZACH.</p>"
  );
});

test("Handlebars Render Raw Output (Issue #436)", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addHelpers({
    "raw-helper": function(options) {
      return options.fn();
    }
  });

  let fn = await tr.getCompiledTemplate(
    "{{{{raw-helper}}}}{{bar}}{{{{/raw-helper}}}}"
  );
  t.is(await fn({ name: "Zach" }), "{{bar}}");
});

test("Handlebars Render Raw Output (Issue #436 with if statement)", async t => {
  let tr = new TemplateRender("hbs");
  tr.engine.addHelpers({
    "raw-helper": function(options) {
      return options.fn();
    }
  });

  let fn = await tr.getCompiledTemplate(
    `{{{{raw-helper}}}}{{#if ready}}
<p>Ready</p>
{{/if}}{{{{/raw-helper}}}}`
  );
  t.is(
    await fn({ name: "Zach" }),
    `{{#if ready}}
<p>Ready</p>
{{/if}}`
  );
});

test("Handlebars Render #each with Global Variable (Issue #759)", async t => {
  let fn = await new TemplateRender("hbs", "./test/stubs/").getCompiledTemplate(
    `<ul>{{#each navigation as |navItem|}}<li><a href={{navItem.link}}>{{../name}}{{navItem.text}}</a></li>{{/each}}</ul>`
  );
  t.is(
    (await fn({
      name: "Zach",
      navigation: [{ link: "a", text: "text" }]
    })).trim(),
    `<ul><li><a href=a>Zachtext</a></li></ul>`
  );
});
