import test from "ava";
import TemplateRender from "../src/TemplateRender";

class TestEleventyError extends Error {}

async function getPromise(resolveTo) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(resolveTo);
    });
  });
}

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

test("Nunjucks Render Addition", async t => {
  let fn = await new TemplateRender("njk").getCompiledTemplate(
    "<p>{{ number + 1 }}</p>"
  );
  t.is(await fn({ number: 1 }), "<p>2</p>");
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

  // should look in _includes too, related to Issue #633
  let fn2a = await tr.getCompiledTemplate(
    "<p>{% include 'included-relative.njk' %}</p>"
  );
  t.is(await fn2a(), "<p>akdlsjafkljdskl</p>");

  // should look in _includes too Issue #633
  // let fn3 = await tr.getCompiledTemplate(
  //   "<p>{% include '../_includes/included-relative.njk' %}</p>"
  // );
  // t.is(await fn3(), "<p>akdlsjafkljdskl</p>");
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

test("Nunjucks Async Filter", async t => {
  let tr = new TemplateRender("njk", "test/stubs");
  let engine = tr.engine;
  engine.addFilters(
    {
      myAsyncFilter: function(value, callback) {
        setTimeout(function() {
          callback(null, `HI${value}`);
        }, 100);
      }
    },
    true
  );
  let fn = await tr.getCompiledTemplate("{{ 'test' | myAsyncFilter }}");
  t.is((await fn()).trim(), "HItest");
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

  t.is(await tr._testRender("{% postfixWithZach %}", {}), "Zach");
});

test("Nunjucks Shortcode", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(str) {
    return str + "Zach";
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", { name: "test" }),
    "testZach"
  );
});

test("Nunjucks Async Shortcode", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode(
    "postfixWithZach",
    function(str) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(str + "Zach");
        });
      });
    },
    true
  );

  t.is(
    await tr._testRender("{% postfixWithZach name %}", { name: "test" }),
    "testZach"
  );
});

test("Nunjucks Async function Shortcode", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode(
    "postfixWithZach",
    async function(str) {
      return await getPromise(str + "Zach");
    },
    true
  );

  t.is(
    await tr._testRender("{% postfixWithZach name %}", { name: "test" }),
    "testZach"
  );
});

test("Nunjucks Async function Shortcode (with sync function, error throwing)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode(
    "postfixWithZach",
    function(str) {
      throw new Error(
        "Nunjucks Async function Shortcode (with sync function, error throwing)"
      );
    },
    true
  );

  let error = await t.throwsAsync(async () => {
    await tr._testRender("{% postfixWithZach name %}", { name: "test" });
  });
  t.true(
    error.message.indexOf(
      "Nunjucks Async function Shortcode (with sync function, error throwing)"
    ) > -1
  );
});

test("Nunjucks Async function Shortcode (with async function, error throwing)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode(
    "postfixWithZachError",
    async function(str) {
      throw new Error(
        "Nunjucks Async function Shortcode (with async function, error throwing)"
      );
    },
    true
  );

  let error = await t.throwsAsync(async () => {
    await tr._testRender("{% postfixWithZachError name %}", { name: "test" });
  });
  t.true(
    error.message.indexOf(
      "Nunjucks Async function Shortcode (with async function, error throwing)"
    ) > -1
  );
});

test("Nunjucks Async function paired Shortcode (with sync function, error throwing)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode(
    "postfixWithZachError",
    function(str) {
      throw new Error(
        "Nunjucks Async function paired Shortcode (with sync function, error throwing)"
      );
    },
    true
  );

  let error = await t.throwsAsync(async () => {
    await tr._testRender(
      "{% postfixWithZachError name %}hi{% endpostfixWithZachError %}",
      { name: "test" }
    );
  });
  t.true(
    error.message.indexOf(
      "Nunjucks Async function paired Shortcode (with sync function, error throwing)"
    ) > -1
  );
});

test("Nunjucks Async function paired Shortcode (with async function, error throwing)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode(
    "postfixWithZachError",
    async function(str) {
      throw new Error(
        "Nunjucks Async function paired Shortcode (with async function, error throwing)"
      );
    },
    true
  );

  let error = await t.throwsAsync(async () => {
    await tr._testRender(
      "{% postfixWithZachError name %}hi{% endpostfixWithZachError %}",
      { name: "test" }
    );
  });
  t.true(
    error.message.indexOf(
      "Nunjucks Async function paired Shortcode (with async function, error throwing)"
    ) > -1
  );
});

test("Nunjucks Shortcode Safe Output", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(str) {
    return `<span>${str}</span>`;
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", { name: "test" }),
    "<span>test</span>"
  );
});

test("Nunjucks Paired Shortcode", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function(content, str) {
    return str + content + "Zach";
  });

  t.is(
    await tr._testRender(
      "{% postfixWithZach name %}Content{% endpostfixWithZach %}",
      { name: "test" }
    ),
    "testContentZach"
  );
});

test("Nunjucks Async Paired Shortcode", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode(
    "postfixWithZach",
    function(content, str) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(str + content + "Zach");
        });
      });
    },
    true
  );

  t.is(
    await tr._testRender(
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
    await tr._testRender(
      "{% postfixWithZach %}Content{% endpostfixWithZach %}",
      {}
    ),
    "ContentZach"
  );
});

test("Nunjucks Paired Shortcode with Tag Inside", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function(content, str) {
    return str + content + "Zach";
  });

  t.is(
    await tr._testRender(
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
    await tr._testRender(
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
    await tr._testRender("{% postfixWithZach name, other %}", {
      name: "test",
      other: "howdy"
    }),
    "testhowdyZach"
  );
});

test("Nunjucks Shortcode Multiple Args (Comma is required)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(str, str2) {
    return str + str2 + "Zach";
  });

  await t.throwsAsync(async () => {
    await tr._testRender("{% postfixWithZach name other %}", {
      name: "test",
      other: "howdy"
    });
  });
});

test("Nunjucks Shortcode Named Args", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function(arg) {
    return arg.arg1 + arg.arg2 + "Zach";
  });

  t.is(
    await tr._testRender("{% postfixWithZach arg1=name, arg2=other %}", {
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
    await tr._testRender("{% postfixWithZach arg2=other, arg1=name %}", {
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
    await tr._testRender("{% postfixWithZach { arg1: name, arg2: other } %}", {
      name: "test",
      other: "howdy"
    }),
    "testhowdyZach"
  );
});

test("Nunjucks Test if statements on arrays (Issue #524)", async t => {
  let tr = new TemplateRender("njk", "./test/stubs/");

  t.is(
    await tr._testRender("{% if 'first' in tags %}Success.{% endif %}", {
      tags: ["first", "second"]
    }),
    "Success."
  );

  t.is(
    await tr._testRender(
      "{% if 'sdfsdfs' in tags %}{% else %}Success.{% endif %}",
      {
        tags: ["first", "second"]
      }
    ),
    "Success."
  );

  t.is(
    await tr._testRender(
      "{% if false %}{% elseif 'first' in tags %}Success.{% endif %}",
      {
        tags: ["first", "second"]
      }
    ),
    "Success."
  );

  t.is(
    await tr._testRender("{% if tags.includes('first') %}Success.{% endif %}", {
      tags: ["first", "second"]
    }),
    "Success."
  );

  t.is(
    await tr._testRender(
      "{% if tags.includes('dsds') %}{% else %}Success.{% endif %}",
      {
        tags: ["first", "second"]
      }
    ),
    "Success."
  );

  t.is(
    await tr._testRender(
      "{% if false %}{% elseif tags.includes('first') %}Success.{% endif %}",
      {
        tags: ["first", "second"]
      }
    ),
    "Success."
  );
});

test("Issue 611: Run a function", async t => {
  // This does not work in Liquid
  let tr = new TemplateRender("njk", "./test/stubs/");

  t.is(
    await tr._testRender("{{ test() }}", {
      test: function() {
        return "alkdsjfksljaZach";
      }
    }),
    "alkdsjfksljaZach"
  );
});
