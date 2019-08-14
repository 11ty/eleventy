import test from "ava";
import TemplateRender from "../src/TemplateRender";

// Twig
test("Twig", t => {
  t.is(new TemplateRender("twig", "test/stubs").getEngineName(), "twig");
});

test("Twig Render", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    "<p>{{ name }}</p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("Twig Render Extends", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    "{% extends 'base.twig' %}{% block content %}This is a child.{% endblock %}"
  );
  t.is(await fn(), "<p>This is a child.</p>");
});

test.skip("Twig Render Relative Extends", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/twig-relative/dir/does_not_exist_and_thats_ok.twig",
    "test/stubs"
  ).getCompiledTemplate(
    "{% extends '../dir/base.twig' %}{% block content %}This is a child.{% endblock %}"
  );
  t.is(await fn(), "<p>This is a child.</p>");
});

test("Twig Render Include", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    "<p>{% include 'included.twig' %}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Twig Render Include (different extension)", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    "<p>{% include 'included.nunj' %}</p>"
  );
  t.is(await fn(), "<p>Nunjabusiness</p>");
});

test("Twig Render Include (different extension, subdir)", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    "<p>{% include 'subfolder/included.nunj' %}</p>"
  );
  t.is(await fn(), "<p>Nunjabusiness2</p>");
});

// @todo - Not sure what this test is trying to test
test.skip("Twig Render Relative Include Issue #190", async t => {
  let tr = new TemplateRender(
    "./test/stubs/twig-relative/does_not_exist_and_thats_ok.twig",
    "./test/stubs"
  );
  let fn = await tr.getCompiledTemplate(
    "<p>{% include './dir/included.twig' %}</p>"
  );
  t.is(await fn(), "<p>HELLO FROM THE OTHER SIDE.</p>");
});

// @todo - Not sure what this test is trying to test
test.skip("Twig Render Relative Include (using ..) Issue #190", async t => {
  let tr = new TemplateRender(
    "./test/stubs/twig-relative/dir/does_not_exist_and_thats_ok.twig",
    "./test/stubs"
  );
  let fn = await tr.getCompiledTemplate(
    "<p>{% include '../dir/included.twig' %}</p>"
  );
  t.is(await fn(), "<p>HELLO FROM THE OTHER SIDE.</p>");
});

// @todo - Not sure what this test is trying to test
test.skip("Twig Render Relative Include (using current dir) Issue #190", async t => {
  let tr = new TemplateRender(
    "./test/stubs/twig-relative/dir/does_not_exist_and_thats_ok.twig",
    "./test/stubs"
  );
  let fn = await tr.getCompiledTemplate(
    "<p>{% include './included.twig' %}</p>"
  );
  t.is(await fn(), "<p>HELLO FROM THE OTHER SIDE.</p>");

  // This fails because ./ doesn’t look in _includes (this is good)
  // let fn = await tr.getCompiledTemplate(
  //   "<p>{% include './included-relative.twig' %}</p>"
  // );
  // t.is(await fn(), "<p>akdlsjafkljdskl</p>");
});

// @todo - Not sure what this test is trying to test
test.skip("Twig Render Relative Include (ambiguous path, file exists in _includes and in current dir) Issue #190", async t => {
  let tr = new TemplateRender(
    "./test/stubs/twig-relative/dir/does_not_exist_and_thats_ok.twig",
    "./test/stubs"
  );
  let fn = await tr.getCompiledTemplate(
    // should prefer to use _includes first
    // more specifically, this will not use the current dir at all.
    "<p>{% include 'included.twig' %}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");

  // This fails, a leading dot is required for a relative include
  // let tr2 = new TemplateRender("./test/stubs/twig-relative/dir/does_not_exist_and_thats_ok.twig", "./test/stubs");
  // let fn2 = await tr.getCompiledTemplate(
  //   "<p>{% include 'unique-include-123.twig' %}</p>"
  // );
  // t.is(await fn2(), "<p>HELLO FROM THE OTHER SIDE.</p>");
});

test.skip("Twig Render Include a JS file (Issue 398)", async t => {
  let tr = new TemplateRender("twig", "test/stubs");
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

test("Twig Render Include Subfolder", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    "<p>{% include 'subfolder/included.html' %}</p>"
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Twig Render Include Double Quotes", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    `<p>{% include "included.twig" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Twig Render Include Subfolder Double Quotes", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    `<p>{% include "subfolder/included.html" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Twig Render Imports", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    "{% import 'imports.twig' as forms %}<div>{{ forms.label('Name') }}</div>"
  );
  t.is(await fn(), "<div><label>Name</label></div>");
});

// @todo - Not sure what this test is trying to test
test.skip("Twig Render Relative Imports", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/twig-relative/dir/does_not_exist_and_thats_ok.twig",
    "test/stubs"
  ).getCompiledTemplate(
    "{% import '../dir/imports.twig' as forms %}<div>{{ forms.label('Name') }}</div>"
  );
  t.is(await fn(), "<div><label>Name</label></div>");
});

test("Twig Render Imports From", async t => {
  let fn = await new TemplateRender("twig", "test/stubs").getCompiledTemplate(
    "{% from 'imports.twig' import label %}<div>{{ label('Name') }}</div>"
  );
  t.is(await fn(), "<div><label>Name</label></div>");
});

test("Twig getEngineLib", async t => {
  let tr = new TemplateRender("twig", "./test/stubs/");
  t.truthy(tr.engine.getEngineLib());
});

// @todo - This is broken because we need the string loader / TwingLoaderArray workaround
// We can do that by using .getLoader() on the passed in `env`
test.skip("Twig Render: with Library Override", async t => {
  let tr = new TemplateRender("twig");

  let lib = require("twing");
  let env = new lib.TwingEnvironment(
    new lib.TwingLoaderFilesystem("./test/stubs/_includes/")
  );
  tr.engine.setLibrary(env);

  let fn = await tr.getCompiledTemplate("<p>{{ name }}</p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

// test("Twig Render with getGlobals Issue #567", async t => {
//   let tr = new TemplateRender("twig");
//   let env = tr.engine.getEngineLib();
//   env.addGlobal("getGlobals", function() {
//     return this.getVariables();
//   });

//   let fn = await tr.getCompiledTemplate(
//     "<p>{{ getGlobals()['my-global-name'] }}</p>"
//   );
//   t.is(await fn({ "my-global-name": "Zach" }), "<p>Zach</p>");
// });

// test("Twig Render with getVarByName Filter Issue #567", async t => {
//   let tr = new TemplateRender("twig");
//   let env = tr.engine.getEngineLib();
//   env.addFilter("getVarByName", function(varName) {
//     return this.getVariables()[varName];
//   });

//   let fn = await tr.getCompiledTemplate(
//     "<p>{{ 'my-global-name' | getVarByName }}</p>"
//   );
//   t.is(await fn({ "my-global-name": "Zach" }), "<p>Zach</p>");
// });

test("Twig Filter", async t => {
  let tr = new TemplateRender("twig", "./test/stubs/");
  tr.engine.addFilter("uppercase", function(str) {
    return str.toUpperCase();
  });

  t.is(await tr.render("{{ test|uppercase }}", { test: "up!" }), "UP!");
});

test("Twig Shortcode without args", async t => {
  let tr = new TemplateRender("twig", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function() {
    return "Zach";
  });

  t.is(await tr.render("{% postfixWithZach %}", {}), "Zach");
});

// @todo - This one is still to do, we have to figure out how to compile the variables (if at all possible)
// before passing them on to the shortcode function
test.skip("Twig Shortcode", async t => {
  let tr = new TemplateRender("twig", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(str) {
    return str + "Zach";
  });

  t.is(
    await tr.render("{% postfixWithZach name %}", { name: "test" }),
    "testZach"
  );
});

// test("Twig Shortcode Safe Output", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addShortcode("postfixWithZach", function(str) {
//     return `<span>${str}</span>`;
//   });

//   t.is(
//     await tr.render("{% postfixWithZach name %}", { name: "test" }),
//     "<span>test</span>"
//   );
// });

// test("Twig Paired Shortcode", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addPairedShortcode("postfixWithZach", function(content, str) {
//     return str + content + "Zach";
//   });

//   t.is(
//     await tr.render(
//       "{% postfixWithZach name %}Content{% endpostfixWithZach %}",
//       { name: "test" }
//     ),
//     "testContentZach"
//   );
// });

// test("Twig Paired Shortcode without args", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addPairedShortcode("postfixWithZach", function(content) {
//     return content + "Zach";
//   });

//   t.is(
//     await tr.render("{% postfixWithZach %}Content{% endpostfixWithZach %}", {}),
//     "ContentZach"
//   );
// });

// test("Twig Paired Shortcode with Tag Inside", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addPairedShortcode("postfixWithZach", function(content, str) {
//     return str + content + "Zach";
//   });

//   t.is(
//     await tr.render(
//       "{% postfixWithZach name %}Content{% if tester %}If{% endif %}{% endpostfixWithZach %}",
//       { name: "test", tester: true }
//     ),
//     "testContentIfZach"
//   );
// });

// test("Twig Nested Paired Shortcode", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addPairedShortcode("postfixWithZach", function(content, str) {
//     return str + content + "Zach";
//   });

//   t.is(
//     await tr.render(
//       "{% postfixWithZach name %}Content{% postfixWithZach name2 %}Content{% endpostfixWithZach %}{% endpostfixWithZach %}",
//       { name: "test", name2: "test2" }
//     ),
//     "testContenttest2ContentZachZach"
//   );
// });

// test("Twig Shortcode Multiple Args", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addShortcode("postfixWithZach", function(str, str2) {
//     return str + str2 + "Zach";
//   });

//   t.is(
//     await tr.render("{% postfixWithZach name, other %}", {
//       name: "test",
//       other: "howdy"
//     }),
//     "testhowdyZach"
//   );
// });

// test("Twig Shortcode Named Args", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addShortcode("postfixWithZach", function(arg) {
//     return arg.arg1 + arg.arg2 + "Zach";
//   });

//   t.is(
//     await tr.render("{% postfixWithZach arg1=name, arg2=other %}", {
//       name: "test",
//       other: "howdy"
//     }),
//     "testhowdyZach"
//   );
// });

// test("Twig Shortcode Named Args (Reverse Order)", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addShortcode("postfixWithZach", function(arg) {
//     return arg.arg1 + arg.arg2 + "Zach";
//   });

//   t.is(
//     await tr.render("{% postfixWithZach arg2=other, arg1=name %}", {
//       name: "test",
//       other: "howdy"
//     }),
//     "testhowdyZach"
//   );
// });

// test("Twig Shortcode Named Args (JS notation)", async t => {
//   let tr = new TemplateRender("twig", "./test/stubs/");
//   tr.engine.addShortcode("postfixWithZach", function(arg) {
//     return arg.arg1 + arg.arg2 + "Zach";
//   });

//   t.is(
//     await tr.render("{% postfixWithZach { arg1: name, arg2: other } %}", {
//       name: "test",
//       other: "howdy"
//     }),
//     "testhowdyZach"
//   );
// });

test("Twig Test if statements on arrays (Issue #524)", async t => {
  let tr = new TemplateRender("twig", "./test/stubs/");

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
});

// test("Issue 611: Run a function", async t => {
//   // This does not work in Liquid
//   let tr = new TemplateRender("twig", "./test/stubs/");

//   t.is(
//     await tr.render("{{ test() }}", {
//       test: function() {
//         return "alkdsjfksljaZach";
//       }
//     }),
//     "alkdsjfksljaZach"
//   );
// });
