import test from "ava";
import TemplateData from "../src/TemplateData";
import Template from "../src/Template";
import pretty from "pretty";
import normalize from "normalize-path";
import config from "../src/Config";

function cleanHtml(str) {
  return pretty(str, { ocd: true });
}

test("getTemplateSubFolder", t => {
  let tmpl = new Template(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(tmpl.getTemplateSubfolder(), "");
});

test("getTemplateSubFolder, output is a subdir of input", t => {
  let tmpl = new Template(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./test/stubs/_site"
  );
  t.is(tmpl.getTemplateSubfolder(), "");
});

test("output path maps to an html file", async t => {
  let tmpl = new Template(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(tmpl.parsed.dir, "./test/stubs");
  t.is(tmpl.inputDir, "./test/stubs");
  t.is(tmpl.outputDir, "./dist");
  t.is(tmpl.getTemplateSubfolder(), "");
  t.is(await tmpl.getOutputPath(), "./dist/template/index.html");
});

test("subfolder outputs to a subfolder", async t => {
  let tmpl = new Template(
    "./test/stubs/subfolder/subfolder.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(tmpl.parsed.dir, "./test/stubs/subfolder");
  t.is(tmpl.getTemplateSubfolder(), "subfolder");
  t.is(await tmpl.getOutputPath(), "./dist/subfolder/index.html");
});

test("subfolder outputs to double subfolder", async t => {
  let tmpl = new Template(
    "./test/stubs/subfolder/subfolder/subfolder.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(tmpl.parsed.dir, "./test/stubs/subfolder/subfolder");
  t.is(tmpl.getTemplateSubfolder(), "subfolder/subfolder");
  t.is(await tmpl.getOutputPath(), "./dist/subfolder/subfolder/index.html");
});

test("HTML files output to the same as the input directory have a file suffix added (only if index, this is not index).", async t => {
  let tmpl = new Template(
    "./test/stubs/testing.html",
    "./test/stubs",
    "./test/stubs"
  );
  t.is(await tmpl.getOutputPath(), "./test/stubs/testing/index.html");
});

test("HTML files output to the same as the input directory have a file suffix added (only if index, this _is_ index).", async t => {
  let tmpl = new Template(
    "./test/stubs/index.html",
    "./test/stubs",
    "./test/stubs"
  );
  t.is(await tmpl.getOutputPath(), "./test/stubs/index-o.html");
});

test("HTML files output to the same as the input directory have a file suffix added (only if index, this _is_ index).", async t => {
  let tmpl = new Template(
    "./test/stubs/subfolder/index.html",
    "./test/stubs",
    "./test/stubs"
  );
  t.is(await tmpl.getOutputPath(), "./test/stubs/subfolder/index-o.html");
});

test("Test raw front matter from template", t => {
  let tmpl = new Template(
    "./test/stubs/templateFrontMatter.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.truthy(tmpl.inputContent, "template exists and can be opened.");
  t.is(tmpl.frontMatter.data.key1, "value1");
});

test("Test that getData() works", async t => {
  let tmpl = new Template(
    "./test/stubs/templateFrontMatter.ejs",
    "./test/stubs/",
    "./dist"
  );
  let data = await tmpl.getData();

  t.is(data.key1, "value1");
  t.is(data.key3, "value3");

  let mergedFrontMatter = await tmpl.getAllLayoutFrontMatterData(
    tmpl,
    tmpl.getFrontMatterData()
  );

  t.is(mergedFrontMatter.key1, "value1");
  t.is(mergedFrontMatter.key3, "value3");
});

test("More advanced getData()", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let tmpl = new Template(
    "./test/stubs/templateFrontMatter.ejs",
    "./test/stubs/",
    "dist",
    dataObj
  );
  let data = await tmpl.getData({
    key1: "value1override",
    key2: "value2"
  });

  t.is(data[config.keys.package].name, "eleventy-cli");
  t.is(
    data.key1,
    "value1override",
    "local data argument overrides front matter"
  );
  t.is(data.key2, "value2", "local data argument, no front matter");
  t.is(data.key3, "value3", "front matter only");
});

test("One Layout", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let tmpl = new Template(
    "./test/stubs/templateWithLayout.ejs",
    "./test/stubs/",
    "dist",
    dataObj
  );

  t.is(tmpl.frontMatter.data[config.keys.layout], "defaultLayout");

  let data = await tmpl.getData();
  t.is(data[config.keys.layout], "defaultLayout");

  t.is(
    cleanHtml(await tmpl.renderLayout(tmpl, data)),
    `<div id="layout">
  <p>Hello.</p>
</div>`
  );

  let mergedFrontMatter = await tmpl.getAllLayoutFrontMatterData(
    tmpl,
    tmpl.getFrontMatterData()
  );

  t.is(mergedFrontMatter.keymain, "valuemain");
  t.is(mergedFrontMatter.keylayout, "valuelayout");
});

test("Two Layouts", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let tmpl = new Template(
    "./test/stubs/templateTwoLayouts.ejs",
    "./test/stubs/",
    "dist",
    dataObj
  );

  t.is(tmpl.frontMatter.data[config.keys.layout], "layout-a");

  let data = await tmpl.getData();
  t.is(data[config.keys.layout], "layout-a");
  t.is(data.key1, "value1");

  t.is(
    cleanHtml(await tmpl.renderLayout(tmpl, data)),
    `<div id="layout-b">
  <div id="layout-a">
    <p>value2-a</p>
  </div>
</div>`
  );

  let mergedFrontMatter = await tmpl.getAllLayoutFrontMatterData(
    tmpl,
    tmpl.getFrontMatterData()
  );

  t.is(mergedFrontMatter.daysPosted, 152);
});

test("Liquid template", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let tmpl = new Template(
    "./test/stubs/formatTest.liquid",
    "./test/stubs/",
    "dist",
    dataObj
  );

  t.is(await tmpl.render(), `<p>Zach</p>`);
});

test("Liquid template with include", async t => {
  let tmpl = new Template(
    "./test/stubs/includer.liquid",
    "./test/stubs/",
    "dist"
  );

  t.is((await tmpl.render()).trim(), `<p>This is an include.</p>`);
});

test("ES6 Template Literal (No Backticks)", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let tmpl = new Template(
    "./test/stubs/formatTest.jstl",
    "./test/stubs/",
    "dist",
    dataObj
  );

  t.is((await tmpl.render()).trim(), `<p>ZACH</p>`);
});

test("ES6 Template Literal (with Backticks)", async t => {
  let dataObj = new TemplateData("./test/stubs/");
  let tmpl = new Template(
    "./test/stubs/formatTestBackticks.jstl",
    "./test/stubs/",
    "dist",
    dataObj
  );

  t.is((await tmpl.render()).trim(), `<p>ZACH</p>`);
});

test("Permalink output directory", async t => {
  let tmpl = new Template(
    "./test/stubs/permalinked.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(await tmpl.getOutputPath(), "./dist/permalinksubfolder/index.html");
});

test("Local template data file import (without a global data json)", async t => {
  let dataObj = new TemplateData();
  await dataObj.cacheData();

  let tmpl = new Template(
    "./test/stubs/component/component.njk",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  let data = await tmpl.getData();
  t.is(tmpl.getLocalDataPath(), "./test/stubs/component/component.json");
  t.is(data.localdatakey1, "localdatavalue1");
  t.is(await tmpl.render(), "localdatavalue1");
});

test("Clone the template", async t => {
  let tmpl = new Template(
    "./test/stubs/default.ejs",
    "./test/stubs/",
    "./dist"
  );

  let cloned = tmpl.clone();

  t.is(await tmpl.getOutputPath(), "./dist/default/index.html");
  t.is(await cloned.getOutputPath(), "./dist/default/index.html");
});

test("Permalink with variables!", async t => {
  let tmpl = new Template(
    "./test/stubs/permalinkdata.njk",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/subdir/slug-candidate/index.html");
});

test("mapDataAsRenderedTemplates", async t => {
  let tmpl = new Template(
    "./test/stubs/default.ejs",
    "./test/stubs/",
    "./dist"
  );

  t.deepEqual(
    await tmpl.mapDataAsRenderedTemplates(
      {
        key1: "value1",
        key2: "value2",
        key3: "value3"
      },
      { parsedKey: "parsedValue" }
    ),
    {
      key1: "value1",
      key2: "value2",
      key3: "value3"
    }
  );

  t.deepEqual(
    await tmpl.mapDataAsRenderedTemplates(
      {
        key1: "value1",
        key2: "<%= parsedKey %>"
      },
      { parsedKey: "parsedValue" }
    ),
    {
      key1: "value1",
      key2: "parsedValue"
    }
  );

  t.deepEqual(
    await tmpl.mapDataAsRenderedTemplates(
      {
        key1: "value1",
        key2: ["<%= parsedKey %>", 2]
      },
      { parsedKey: "parsedValue" }
    ),
    {
      key1: "value1",
      key2: ["parsedValue", 2]
    }
  );
});

test("renderData", async t => {
  let tmpl = new Template(
    "./test/stubs/renderData/renderData.njk",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.render()).trim(), `hi:value2-value1.css`);
});
