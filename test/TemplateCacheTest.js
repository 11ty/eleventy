import test from "ava";
import Template from "../src/Template.js";
import TemplateCache from "../src/TemplateCache.js";

import getNewTemplate from "./_getNewTemplateForTests.js";

const { clear, add, size, has, get } = TemplateCache;

test("Cache can save templates", (t) => {
  clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  add("./test/stubs/template.ejs", tmpl);
  t.is(size(), 1);
});

test("TemplateCache clear", (t) => {
  clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  add("./test/stubs/template.ejs", tmpl);
  t.is(size(), 1);
  clear();
  t.is(size(), 0);
});

test("TemplateCache has", (t) => {
  clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  add("./test/stubs/template.ejs", tmpl);
  t.is(has("./test/stubs/template.ejs"), true);
});

test("TemplateCache get success", (t) => {
  clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  add("./test/stubs/template.ejs", tmpl);
  t.truthy(get("./test/stubs/template.ejs"));
});

test("TemplateCache get fail", (t) => {
  clear();

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );

  add("./test/stubs/template.ejs", tmpl);
  t.throws(function () {
    get("./test/stubs/template298374892.ejs");
  });
});
