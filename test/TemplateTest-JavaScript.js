import test from "ava";
import Template from "../src/Template";

test("JavaScript template type (function)", async t => {
  let tmpl = new Template(
    "./test/stubs/function.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/function/index.html");
  let data = await tmpl.getData();
  data.name = "Zach";

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "<p>Zach</p>");
});

test("JavaScript template type (class with data getter)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/class-data/index.html");
  let data = await tmpl.getData();

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "<p>Ted</p>");
});

test("JavaScript template type (class with data method)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-fn.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/class-data-fn/index.html");
  let data = await tmpl.getData();

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "<p>Ted</p>");
});

test("JavaScript template type (class with shorthand data method)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-fn-shorthand.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/class-data-fn-shorthand/index.html");
  let data = await tmpl.getData();

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "<p>Ted</p>");
});

test("JavaScript template type (class with async data method)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-async-data-fn.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/class-async-data-fn/index.html");
  let data = await tmpl.getData();

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "<p>Ted</p>");
});

test("JavaScript template type (class with data getter and a javascriptFunction)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-filter.11ty.js",
    "./test/stubs/",
    "./dist"
  );
  tmpl.templateRender.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  t.is(await tmpl.getOutputPath(), "./dist/class-data-filter/index.html");
  let data = await tmpl.getData();
  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "<p>TED</p>");
});

test("JavaScript template type (class with data method and a javascriptFunction)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-fn-filter.11ty.js",
    "./test/stubs/",
    "./dist"
  );
  tmpl.templateRender.config = {
    javascriptFunctions: {
      upper: function(val) {
        return new String(val).toUpperCase();
      }
    }
  };

  t.is(await tmpl.getOutputPath(), "./dist/class-data-fn-filter/index.html");
  let data = await tmpl.getData();
  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "<p>TED</p>");
});

test("JavaScript template type (class with data permalink)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-permalink.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/my-permalink/index.html");
});

test("JavaScript template type (class with data permalink using a buffer)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-permalink-buffer.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/my-permalink/index.html");
});

test("JavaScript template type (class with data permalink function)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-permalink-fn.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/my-permalink/value1/index.html");
});

test("JavaScript template type (class with data permalink function using a buffer)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-permalink-fn-buffer.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/my-permalink/value1/index.html");
});

test("JavaScript template type (class with data permalink async function)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-permalink-async-fn.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/my-permalink/value1/index.html");
});

test("JavaScript template type (class with data permalink function using a filter)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-permalink-fn-filter.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    await tmpl.getOutputPath(),
    "./dist/my-permalink/my-super-cool-title/index.html"
  );
});

test("JavaScript template type (class with renderData)", async t => {
  let tmpl = new Template(
    "./test/stubs/class-data-renderdata.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getRenderedData();
  let pages = await tmpl.getRenderedTemplates(data);
  t.is(
    pages[0].templateContent.trim(),
    "<p>StringTesthowdy Zach, meet Thanos</p>"
  );
});
