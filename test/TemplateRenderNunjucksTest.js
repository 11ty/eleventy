import test from "ava";
import TemplateRender from "../src/TemplateRender";

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

test("Nunjucks Render Relative Extends", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/njk-relative/dir/does_not_exist_and_thats_ok.njk",
    "test/stubs"
  ).getCompiledTemplate(
    "{% extends '../dir/base.njk' %}{% block content %}This is a child.{% endblock %}"
  );
  t.is(await fn(), "<p>This is a child.</p>");
});

test("Nunjucks Render Include", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "<p>{% include 'included.njk' %}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Nunjucks Render Include (different extension)", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "<p>{% include 'included.nunj' %}</p>"
  );
  t.is(await fn(), "<p>Nunjabusiness</p>");
});

test("Nunjucks Render Include (different extension, subdir)", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "<p>{% include 'subfolder/included.nunj' %}</p>"
  );
  t.is(await fn(), "<p>Nunjabusiness2</p>");
});

test("Nunjucks Render Relative Include Issue #190", async t => {
  let tr = new TemplateRender(
    "./test/stubs/njk-relative/does_not_exist_and_thats_ok.njk",
    "./test/stubs"
  );
  let fn = await tr.getCompiledTemplate(
    "<p>{% include './dir/included.njk' %}</p>"
  );
  t.is(await fn(), "<p>HELLO FROM THE OTHER SIDE.</p>");
});

test("Nunjucks Render Relative Include (using ..) Issue #190", async t => {
  let tr = new TemplateRender(
    "./test/stubs/njk-relative/dir/does_not_exist_and_thats_ok.njk",
    "./test/stubs"
  );
  let fn = await tr.getCompiledTemplate(
    "<p>{% include '../dir/included.njk' %}</p>"
  );
  t.is(await fn(), "<p>HELLO FROM THE OTHER SIDE.</p>");
});

test("Nunjucks Render Relative Include (using current dir) Issue #190", async t => {
  let tr = new TemplateRender(
    "./test/stubs/njk-relative/dir/does_not_exist_and_thats_ok.njk",
    "./test/stubs"
  );
  let fn = await tr.getCompiledTemplate(
    "<p>{% include './included.njk' %}</p>"
  );
  t.is(await fn(), "<p>HELLO FROM THE OTHER SIDE.</p>");

  // This fails because ./ doesn’t look in _includes (this is good)
  // let fn = await tr.getCompiledTemplate(
  //   "<p>{% include './included-relative.njk' %}</p>"
  // );
  // t.is(await fn(), "<p>akdlsjafkljdskl</p>");
});

test("Nunjucks Render Relative Include (ambiguous path, file exists in _includes and in current dir) Issue #190", async t => {
  let tr = new TemplateRender(
    "./test/stubs/njk-relative/dir/does_not_exist_and_thats_ok.njk",
    "./test/stubs"
  );
  let fn = await tr.getCompiledTemplate(
    // should prefer to use _includes first
    // more specifically, this will not use the current dir at all.
    "<p>{% include 'included.njk' %}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");

  // This fails, a leading dot is required for a relative include
  // let tr2 = new TemplateRender("./test/stubs/njk-relative/dir/does_not_exist_and_thats_ok.njk", "./test/stubs");
  // let fn2 = await tr.getCompiledTemplate(
  //   "<p>{% include 'unique-include-123.njk' %}</p>"
  // );
  // t.is(await fn2(), "<p>HELLO FROM THE OTHER SIDE.</p>");
});

test("Nunjucks Render Include a JS file (Issue 398)", async t => {
  let tr = new TemplateRender("njk", "test/stubs");
  let engine = tr.engine;
  engine.addFilters({
    jsmin: function(str) {
      return str;
    }
  });
  let fn = await tr.getCompiledTemplate(
    "{% set ga %}{% include 'test.js' %}{% endset %}{{ ga | safe | jsmin }}"
  );
  t.is((await fn()).trim(), `/* THIS IS A COMMENT */ alert("Issue #398");`);
});

test("Nunjucks Render Include Subfolder", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "<p>{% include 'subfolder/included.html' %}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Nunjucks Render Include Double Quotes", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    `<p>{% include "included.njk" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Nunjucks Render Include Subfolder Double Quotes", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    `<p>{% include "subfolder/included.html" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Nunjucks Render Imports", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "{% import 'imports.njk' as forms %}<div>{{ forms.label('Name') }}</div>"
  );
  t.is(await fn(), "<div><label>Name</label></div>");
});

test("Nunjucks Render Relative Imports", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/njk-relative/dir/does_not_exist_and_thats_ok.njk",
    "test/stubs"
  ).getCompiledTemplate(
    "{% import '../dir/imports.njk' as forms %}<div>{{ forms.label('Name') }}</div>"
  );
  t.is(await fn(), "<div><label>Name</label></div>");
});

test("Nunjucks Render Imports From", async t => {
  let fn = await new TemplateRender("njk", "test/stubs").getCompiledTemplate(
    "{% from 'imports.njk' import label %}<div>{{ label('Name') }}</div>"
  );
  t.is(await fn(), "<div><label>Name</label></div>");
});

test("Nunjucks getEngineLib", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  t.truthy(tr.engine.getEngineLib());
});

test("Nunjucks Render: with Library Override", async t => {
  let tr = new TemplateRender("njk");

  let lib = require("nunjucks");
  let env = new lib.Environment(
    new lib.FileSystemLoader("./test/stubs/_includes/")
  );
  tr.engine.setLibrary(env);

  let fn = await tr.getCompiledTemplate("<p>{{ name }}</p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Nunjucks Render with getGlobals Issue #567", async t => {
  let tr = new TemplateRender("njk");
  let env = tr.engine.getEngineLib();
  env.addGlobal("getGlobals", function() {
    return this.getVariables();
  });

  let fn = await tr.getCompiledTemplate(
    "<p>{{ getGlobals()['my-global-name'] }}</p>"
  );
  t.is(await fn({ "my-global-name": "Zach" }), "<p>Zach</p>");
});

test("Nunjucks Render with getVarByName Filter Issue #567", async t => {
  let tr = new TemplateRender("njk");
  let env = tr.engine.getEngineLib();
  env.addFilter("getVarByName", function(varName) {
    return this.getVariables()[varName];
  });

  let fn = await tr.getCompiledTemplate(
    "<p>{{ 'my-global-name' | getVarByName }}</p>"
  );
  t.is(await fn({ "my-global-name": "Zach" }), "<p>Zach</p>");
});

test("Nunjucks Shortcode without args", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function() {
    return "Zach";
  });

  t.is(await tr.render("{% postfixWithZach %}", {}), "Zach");
});

test("Nunjucks Shortcode", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(str) {
    return str + "Zach";
  });

  t.is(
    await tr.render("{% postfixWithZach name %}", { name: "test" }),
    "testZach"
  );
});

test("Nunjucks Shortcode Safe Output", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(str) {
    return `<span>${str}</span>`;
  });

  t.is(
    await tr.render("{% postfixWithZach name %}", { name: "test" }),
    "<span>test</span>"
  );
});

test("Nunjucks Paired Shortcode", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function(content, str) {
    return str + content + "Zach";
  });

  t.is(
    await tr.render(
      "{% postfixWithZach name %}Content{% endpostfixWithZach %}",
      { name: "test" }
    ),
    "testContentZach"
  );
});

test("Nunjucks Paired Shortcode without args", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function(content) {
    return content + "Zach";
  });

  t.is(
    await tr.render("{% postfixWithZach %}Content{% endpostfixWithZach %}", {}),
    "ContentZach"
  );
});

test("Nunjucks Paired Shortcode with Tag Inside", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function(content, str) {
    return str + content + "Zach";
  });

  t.is(
    await tr.render(
      "{% postfixWithZach name %}Content{% if tester %}If{% endif %}{% endpostfixWithZach %}",
      { name: "test", tester: true }
    ),
    "testContentIfZach"
  );
});

test("Nunjucks Nested Paired Shortcode", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function(content, str) {
    return str + content + "Zach";
  });

  t.is(
    await tr.render(
      "{% postfixWithZach name %}Content{% postfixWithZach name2 %}Content{% endpostfixWithZach %}{% endpostfixWithZach %}",
      { name: "test", name2: "test2" }
    ),
    "testContenttest2ContentZachZach"
  );
});

test("Nunjucks Shortcode Multiple Args", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(str, str2) {
    return str + str2 + "Zach";
  });

  t.is(
    await tr.render("{% postfixWithZach name, other %}", {
      name: "test",
      other: "howdy"
    }),
    "testhowdyZach"
  );
});

test("Nunjucks Shortcode Named Args", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(arg) {
    return arg.arg1 + arg.arg2 + "Zach";
  });

  t.is(
    await tr.render("{% postfixWithZach arg1=name, arg2=other %}", {
      name: "test",
      other: "howdy"
    }),
    "testhowdyZach"
  );
});

test("Nunjucks Shortcode Named Args (Reverse Order)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(arg) {
    return arg.arg1 + arg.arg2 + "Zach";
  });

  t.is(
    await tr.render("{% postfixWithZach arg2=other, arg1=name %}", {
      name: "test",
      other: "howdy"
    }),
    "testhowdyZach"
  );
});

test("Nunjucks Shortcode Named Args (JS notation)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(arg) {
    return arg.arg1 + arg.arg2 + "Zach";
  });

  t.is(
    await tr.render("{% postfixWithZach { arg1: name, arg2: other } %}", {
      name: "test",
      other: "howdy"
    }),
    "testhowdyZach"
  );
});

test("Nunjucks Test if statements on arrays (Issue #524)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");

  t.is(
    await tr.render("{% if 'first' in tags %}Success.{% endif %}", {
      tags: ["first", "second"]
    }),
    "Success."
  );

  t.is(
    await tr.render("{% if 'sdfsdfs' in tags %}{% else %}Success.{% endif %}", {
      tags: ["first", "second"]
    }),
    "Success."
  );

  t.is(
    await tr.render(
      "{% if false %}{% elseif 'first' in tags %}Success.{% endif %}",
      {
        tags: ["first", "second"]
      }
    ),
    "Success."
  );

  t.is(
    await tr.render("{% if tags.includes('first') %}Success.{% endif %}", {
      tags: ["first", "second"]
    }),
    "Success."
  );

  t.is(
    await tr.render(
      "{% if tags.includes('dsds') %}{% else %}Success.{% endif %}",
      {
        tags: ["first", "second"]
      }
    ),
    "Success."
  );

  t.is(
    await tr.render(
      "{% if false %}{% elseif tags.includes('first') %}Success.{% endif %}",
      {
        tags: ["first", "second"]
      }
    ),
    "Success."
  );
});
