const test = require("ava");
const getNewTemplate = require("./_getNewTemplateForTests");
const TemplateConfig = require("../src/TemplateConfig");
const TemplateData = require("../src/TemplateData");

// Prior to and including 0.10.0 this mismatched the documentation)! (Issue #915)
test("Layout front matter does not override template data files", async (t) => {
  let eleventyConfig = new TemplateConfig();

  let dataObj = new TemplateData(
    "./test/stubs-data-cascade/layout-data-files/",
    eleventyConfig
  );
  let tmpl = getNewTemplate(
    "./test/stubs-data-cascade/layout-data-files/test.njk",
    "./test/stubs-data-cascade/layout-data-files/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(data.shared, "datafile");
});

test("Layout front matter should not override global data (sanity check, Issue 915)", async (t) => {
  let eleventyConfig = new TemplateConfig();

  let dataObj = new TemplateData(
    "./test/stubs-data-cascade/global-versus-layout/",
    eleventyConfig
  );
  let tmpl = getNewTemplate(
    "./test/stubs-data-cascade/global-versus-layout/test.njk",
    "./test/stubs-data-cascade/global-versus-layout/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(data.cascade, "from-layout-file");
});

test("Template data files should be more specific in data cascade than Layout front matter (breaking change in 1.0, issue 915)", async (t) => {
  let eleventyConfig = new TemplateConfig();

  let dataObj = new TemplateData(
    "./test/stubs-data-cascade/layout-versus-tmpldatafile/",
    eleventyConfig
  );
  let tmpl = getNewTemplate(
    "./test/stubs-data-cascade/layout-versus-tmpldatafile/test.njk",
    "./test/stubs-data-cascade/layout-versus-tmpldatafile/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(data.cascade, "template-data-file");
});

test("Directory data files should be more specific in data cascade than Layout front matter (breaking change in 1.0, issue 915)", async (t) => {
  let eleventyConfig = new TemplateConfig();

  let dataObj = new TemplateData(
    "./test/stubs-data-cascade/layout-versus-dirdatafile/src/",
    eleventyConfig
  );
  let tmpl = getNewTemplate(
    "./test/stubs-data-cascade/layout-versus-dirdatafile/src/test.njk",
    "./test/stubs-data-cascade/layout-versus-dirdatafile/src/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.is(data.cascade, "dir-data-file");
});
