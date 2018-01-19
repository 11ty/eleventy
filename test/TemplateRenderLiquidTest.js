import test from "ava";
import path from "path";
import LiquidLib from "liquidjs";
import TemplateRender from "../src/TemplateRender";

// Liquid
test("Liquid", t => {
  t.is(new TemplateRender("liquid").getEngineName(), "liquid");
});

test("Liquid Render (with Helper)", async t => {
  let fn = await new TemplateRender("liquid").getCompiledTemplate(
    "<p>{{name | capitalize}}</p>"
  );
  t.is(await fn({ name: "tim" }), "<p>Tim</p>");
});

test("Liquid Render Include", async t => {
  t.is(new TemplateRender("liquid", "./test/stubs/").getEngineName(), "liquid");

  let fn = await new TemplateRender(
    "liquid",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{% include included %}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include with Liquid Suffix", async t => {
  t.is(new TemplateRender("liquid", "./test/stubs/").getEngineName(), "liquid");

  let fn = await new TemplateRender(
    "liquid",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{% include included.liquid %}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include with HTML Suffix", async t => {
  t.is(new TemplateRender("liquid", "./test/stubs/").getEngineName(), "liquid");

  let fn = await new TemplateRender(
    "liquid",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{% include included.html %}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

// This is an upstream limitation of the Liquid implementation
// test("Liquid Render Include No Quotes", async t => {
//   t.is(new TemplateRender("liquid", "./test/stubs/").getEngineName(), "liquid");

//   let fn = await new TemplateRender(
//     "liquid",
//     "./test/stubs/"
//   ).getCompiledTemplate("<p>{% include included.liquid %}</p>");
//   t.is(await fn(), "<p>This is an include.</p>");
// });

test("Liquid Custom Filter", async t => {
  let tr = new TemplateRender("liquid", "./test/stubs/");
  tr.engine.addFilter("prefixWithZach", function(val) {
    return "Zach" + val;
  });

  t.is(await tr.render("{{ 'test' | prefixWithZach }}", {}), "Zachtest");
});

test("Liquid Custom Tag prefixWithZach", async t => {
  let tr = new TemplateRender("liquid", "./test/stubs/");
  tr.engine.addTag("prefixWithZach", {
    parse: function(tagToken, remainTokens) {
      this.str = tagToken.args; // name
    },
    render: function(scope, hash) {
      var str = LiquidLib.evalValue(this.str, scope); // 'alice'
      return Promise.resolve("Zach" + str); // 'Alice'
    }
  });

  t.is(
    await tr.render("{% prefixWithZach name %}", { name: "test" }),
    "Zachtest"
  );
});

test("Liquid Custom Tag postfixWithZach", async t => {
  let tr = new TemplateRender("liquid", "./test/stubs/");
  tr.engine.addTag("postfixWithZach", {
    parse: function(tagToken, remainTokens) {
      this.str = tagToken.args;
    },
    render: function(scope, hash) {
      var str = LiquidLib.evalValue(this.str, scope);
      return Promise.resolve(str + "Zach");
    }
  });

  t.is(
    await tr.render("{% postfixWithZach name %}", { name: "test" }),
    "testZach"
  );
});
