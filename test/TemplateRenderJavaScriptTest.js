import test from "ava";
import TemplateRender from "../src/TemplateRender";
import EleventyExtensionMap from "../src/EleventyExtensionMap";

function getNewTemplateRender(name, inputDir) {
  let tr = new TemplateRender(name, inputDir);
  tr.extensionMap = new EleventyExtensionMap();
  return tr;
}

test("JS", t => {
  t.is(getNewTemplateRender("11ty.js").getEngineName(), "11ty.js");
  t.is(
    getNewTemplateRender("./test/stubs/filename.11ty.js").getEngineName(),
    "11ty.js"
  );
});

test("JS Render a string (no data)", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/string.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>Zach</p>");
});

test("JS Render a promise (no data)", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/promise.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>Zach</p>");
});

test("JS Render a buffer (no data)", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/buffer.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>tést</p>");
});

test("JS Render a function", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/function.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render a function (arrow syntax)", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/function-arrow.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render a function, returns a Buffer", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/function-buffer.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "tést" }), "<p>tést</p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render a function (Markdown)", async t => {
  let tr = getNewTemplateRender("./test/stubs/function-markdown.11ty.js");
  tr.setEngineOverride("11ty.js,md");
  let fn = await tr.getCompiledTemplate();
  t.is((await fn({ name: "Zach" })).trim(), "<h1>Zach</h1>");
  t.is((await fn({ name: "Bill" })).trim(), "<h1>Bill</h1>");
});

test("JS Render a function (Collections)", async t => {
  let tr = getNewTemplateRender("./test/stubs/use-collection.11ty.js");
  let fn = await tr.getCompiledTemplate();
  t.is(
    (await fn({
      collections: {
        post: [
          {
            data: {
              title: "Testing"
            }
          },
          {
            data: {
              title: "Testing2"
            }
          }
        ]
      }
    })).trim(),
    `<ul><li>Testing</li><li>Testing2</li></ul>`
  );
});

test("JS Render an async function", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/function-async.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render with a Class", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/class.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>ZachBillTed</p>");
  t.is(await fn({ name: "Bill" }), "<p>BillBillTed</p>");
});

test("JS Render with a Class, returns a buffer", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/class-buffer.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zách" }), "<p>ZáchBillTed</p>");
  t.is(await fn({ name: "Zach" }), "<p>ZachBillTed</p>");
  t.is(await fn({ name: "Bill" }), "<p>BillBillTed</p>");
});

test("JS Render with a Class, async render", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/class-async.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render using Vue", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/vue.11ty.js"
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
  let fn = await getNewTemplateRender(
    "./test/stubs/vue-layout.11ty.js"
  ).getCompiledTemplate();
  t.is(
    await fn({ name: "Zach" }),
    `<!doctype html>
<title>Test</title>
<p data-server-rendered="true">Hello Zach, this is a Vue template.</p>`
  );
});

test("JS Render using ViperHTML", async t => {
  let fn = await getNewTemplateRender(
    "./test/stubs/viperhtml.11ty.js"
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
  let tr = getNewTemplateRender("./test/stubs/function-filter.11ty.js");
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

test("JS Render with a function prototype", async t => {
  let tr = getNewTemplateRender("./test/stubs/function-prototype.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>ZACHBillT9001</p>");
  t.is(await fn({ name: "Bill" }), "<p>BILLBillT9001</p>");
});

test("JS Class Render with a function", async t => {
  let tr = getNewTemplateRender("./test/stubs/class-filter.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>ZACHBillTed</p>");
  t.is(await fn({ name: "Bill" }), "<p>BILLBillTed</p>");
});

test("JS Class Async Render with a function", async t => {
  let tr = getNewTemplateRender("./test/stubs/class-async-filter.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  // Overrides all names to Ted
  t.is(await fn({ name: "Zach" }), "<p>ZACHBillTed</p>");
  t.is(await fn({ name: "Bill" }), "<p>BILLBillTed</p>");
});
