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
    "./test/stubs/string.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>Zach</p>");
});

test("JS Render a promise (no data)", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/promise.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>Zach</p>");
});

test("JS Render a buffer (no data)", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/buffer.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>tést</p>");
});

test("JS Render a function", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/function.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render a function (arrow syntax)", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/function-arrow.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render a function, returns a Buffer", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/function-buffer.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "tést" }), "<p>tést</p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render a function (Markdown)", async t => {
  let tr = new TemplateRender("./test/stubs/function-markdown.11ty.js");
  tr.setEngineOverride("11ty.js,md");
  let fn = await tr.getCompiledTemplate();
  t.is((await fn({ name: "Zach" })).trim(), "<h1>Zach</h1>");
  t.is((await fn({ name: "Bill" })).trim(), "<h1>Bill</h1>");
});

test("JS Render a function (Collections)", async t => {
  let tr = new TemplateRender("./test/stubs/use-collection.11ty.js");
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
  let fn = await new TemplateRender(
    "./test/stubs/function-async.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render with a Class", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/class.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>ZachBillTed</p>");
  t.is(await fn({ name: "Bill" }), "<p>BillBillTed</p>");
});

test("JS Render with a Class, returns a buffer", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/class-buffer.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zách" }), "<p>ZáchBillTed</p>");
  t.is(await fn({ name: "Zach" }), "<p>ZachBillTed</p>");
  t.is(await fn({ name: "Bill" }), "<p>BillBillTed</p>");
});

test("JS Render with a Class, async render", async t => {
  let fn = await new TemplateRender(
    "./test/stubs/class-async.11ty.js"
  ).getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
  t.is(await fn({ name: "Bill" }), "<p>Bill</p>");
});

test("JS Render using Vue", async t => {
  let fn = await new TemplateRender(
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
  let fn = await new TemplateRender(
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
  let fn = await new TemplateRender(
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
  let tr = new TemplateRender("./test/stubs/function-filter.11ty.js");
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

test("JS Render with a function and async filter", async t => {
  let tr = new TemplateRender("./test/stubs/function-async-filter.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new Promise(function(resolve) {
          resolve(new String(val).toUpperCase());
        });
      }
    }
  };

  let fn = await tr.getCompiledTemplate();
  t.is(await fn({ name: "Zach" }), "<p>ZACH</p>");
  t.is(await fn({ name: "Bill" }), "<p>BILL</p>");
});

test("JS Render with a function prototype", async t => {
  let tr = new TemplateRender("./test/stubs/function-prototype.11ty.js");
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
  let tr = new TemplateRender("./test/stubs/class-filter.11ty.js");
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
  let tr = new TemplateRender("./test/stubs/class-async-filter.11ty.js");
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

test("JS Class Async Render with a function (sync function, throws error)", async t => {
  let tr = new TemplateRender("./test/stubs/function-throws.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: function(val) {
        throw new Error(
          "JS Class Async Render with a function (sync function, throws error)"
        );
      }
    }
  };

  let error = await t.throwsAsync(async () => {
    let fn = await tr.getCompiledTemplate();
    await fn({ name: "Zach" });
  });
  t.true(
    error.message.indexOf(
      "JS Class Async Render with a function (sync function, throws error)"
    ) > -1
  );
});

test("JS Class Async Render with a function (async function, throws error)", async t => {
  let tr = new TemplateRender("./test/stubs/function-throws-async.11ty.js");
  tr.config = {
    javascriptFunctions: {
      upper: async function(val) {
        throw new Error(
          "JS Class Async Render with a function (async function, throws error)"
        );
      }
    }
  };

  let error = await t.throwsAsync(async () => {
    let fn = await tr.getCompiledTemplate();
    await fn({ name: "Zach" });
  });
  t.true(
    error.message.indexOf(
      "JS Class Async Render with a function (async function, throws error)"
    ) > -1
  );
});
