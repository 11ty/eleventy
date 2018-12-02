import test from "ava";
import TemplateRender from "../src/TemplateRender";

test("JS", t => {
  t.is(new TemplateRender("11ty.js").getEngineName(), "11ty.js");
  t.is(
    new TemplateRender("./test/stubs/filename.11ty.js").getEngineName(),
    "11ty.js"
  );
});

test("JS Render a string (no data)", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/string.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>Zach</p>");
});

test("JS Render a function", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/function.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render with a Class", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/class.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>ZachBill</p>");
  t.is(await fn({ name: "Bill" }), "<p>BillBill</p>");
});

test("JS Render with a Class, async render", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/class-async.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render with a Class and Data getter", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/class-data.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn(), "<p>Ted</p>");
  t.is(await fn({ name: "Bill" }), "<p>Ted</p>");
});

test("JS Render with a Class and Data function", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/class-data-fn.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn(), "<p>Ted</p>");
  t.is(await fn({ name: "Bill" }), "<p>Ted</p>");
});

test("JS Render using Vue", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/vue.11ty.js"
  ).getCompiledTemplate();
  t.is(
    await fn({ name: "Zach" }),
    '<p data-server-rendered="true">Hello Zach, this is a Vue template.</p>'
  );
  t.is(
    await fn({ name: "Bill" }),
    '<p data-server-rendered="true">Hello Bill, this is a Vue template.</p>'
  );
});

test("JS Render using Vue (with a layout)", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/vue-layout.11ty.js"
  ).getCompiledTemplate();
  t.is(
    await fn({ name: "Zach" }),
    `<!doctype html>
<title>Test</title>
<p data-server-rendered="true">Hello Zach, this is a Vue template.</p>`
  );
});

test("JS Render using ViperHTML", async t => {
  let fn = await new TemplateRender(
    "../../test/stubs/viperhtml.11ty.js"
  ).getCompiledTemplate();
  t.is(
    await fn({ name: "Zach", html: "<strong>Hi</strong>" }),
    `<div>
  This is a viper template, Zach
  <strong>Hi</strong>
</div>`
  );
});

test("JS Render with a function", async t => {
  let tr = new TemplateRender("../../test/stubs/function-filter.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>ZACHT9000</p>");
  t.is(await fn({ name: "Bill" }), "<p>BILLT9000</p>");
});

test("JS Class Render with a function", async t => {
  let tr = new TemplateRender("../../test/stubs/class-filter.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>ZACHBill</p>");
  t.is(await fn({ name: "Bill" }), "<p>BILLBill</p>");
});

test("JS Class Data Object + Render with a function", async t => {
  let tr = new TemplateRender("../../test/stubs/class-data-filter.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  // Overrides all names to Ted
  t.is(await fn({ name: "Zach" }), "<p>TED</p>");
  t.is(await fn({ name: "Bill" }), "<p>TED</p>");
});

test("JS Class Data Function + Render with a function", async t => {
  let tr = new TemplateRender("../../test/stubs/class-data-fn-filter.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  // Overrides all names to Ted
  t.is(await fn({ name: "Zach" }), "<p>TED</p>");
  t.is(await fn({ name: "Bill" }), "<p>TED</p>");
});

test("JS Class Async Render with a function", async t => {
  let tr = new TemplateRender("../../test/stubs/class-async-filter.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  // Overrides all names to Ted
  t.is(await fn({ name: "Zach" }), "<p>ZACHBill</p>");
  t.is(await fn({ name: "Bill" }), "<p>BILLBill</p>");
});
