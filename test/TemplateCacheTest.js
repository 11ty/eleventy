const test = require("ava");
const Template = require("../src/Template");
const templateCache = require("../src/TemplateCache");

const getNewTemplate = require("./_getNewTemplateForTests");

test("Cache can save templates", (t) => {
  templateCache.clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  templateCache.add("./test/stubs/template.ejs", tmpl);
  t.is(templateCache.size(), 1);
});

test("TemplateCache clear", (t) => {
  templateCache.clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  templateCache.add("./test/stubs/template.ejs", tmpl);
  t.is(templateCache.size(), 1);
  templateCache.clear();
  t.is(templateCache.size(), 0);
});

test("TemplateCache has", (t) => {
  templateCache.clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  templateCache.add("./test/stubs/template.ejs", tmpl);
  t.is(templateCache.has("./test/stubs/template.ejs"), true);
});

test("TemplateCache get success", (t) => {
  templateCache.clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  templateCache.add("./test/stubs/template.ejs", tmpl);
  t.truthy(templateCache.get("./test/stubs/template.ejs"));
});

test("TemplateCache get fail", (t) => {
  templateCache.clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  templateCache.add("./test/stubs/template.ejs", tmpl);
  t.throws(function () {
    templateCache.get("./test/stubs/template298374892.ejs");
  });
});
