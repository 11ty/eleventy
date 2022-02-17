const test = require("ava");
const fsp = require("fs").promises;
const pretty = require("pretty");

const TemplateConfig = require("../src/TemplateConfig");
const TemplateData = require("../src/TemplateData");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const EleventyErrorUtil = require("../src/EleventyErrorUtil");
const TemplateContentPrematureUseError = require("../src/Errors/TemplateContentPrematureUseError");
const normalizeNewLines = require("./Util/normalizeNewLines");
const eventBus = require("../src/EventBus");

const getNewTemplate = require("./_getNewTemplateForTests");

async function getRenderedData(tmpl, pageNumber = 0) {
  let data = await tmpl.getData();
  let templates = await tmpl.getTemplates(data);
  return templates[pageNumber].data;
}

function cleanHtml(str) {
  return pretty(str, { ocd: true });
}

test("getTemplateSubFolder", (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(tmpl.getTemplateSubfolder(), "");
});

test("getTemplateSubFolder, output is a subdir of input", (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./test/stubs/_site"
  );
  t.is(tmpl.getTemplateSubfolder(), "");
});

test("output path maps to an html file", async (t) => {
  let tmpl = getNewTemplate(
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

test("subfolder outputs to a subfolder", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/subfolder/subfolder.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(tmpl.parsed.dir, "./test/stubs/subfolder");
  t.is(tmpl.getTemplateSubfolder(), "subfolder");
  t.is(await tmpl.getOutputPath(), "./dist/subfolder/index.html");
});

test("subfolder outputs to double subfolder", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/subfolder/subfolder/subfolder.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(tmpl.parsed.dir, "./test/stubs/subfolder/subfolder");
  t.is(tmpl.getTemplateSubfolder(), "subfolder/subfolder");
  t.is(await tmpl.getOutputPath(), "./dist/subfolder/subfolder/index.html");
});

test("HTML files output to the same as the input directory have a file suffix added (only if index, this is not index).", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/testing.html",
    "./test/stubs",
    "./test/stubs"
  );
  t.is(await tmpl.getOutputPath(), "./test/stubs/testing/index.html");
});

test("HTML files output to the same as the input directory have a file suffix added (only if index, this _is_ index).", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/index.html",
    "./test/stubs",
    "./test/stubs"
  );
  t.is(await tmpl.getOutputPath(), "./test/stubs/index-o.html");
});

test("HTML files output to the same as the input directory have a file suffix added (only if index, this _is_ index, subfolder).", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/subfolder/index.html",
    "./test/stubs",
    "./test/stubs"
  );
  t.is(await tmpl.getOutputPath(), "./test/stubs/subfolder/index-o.html");
});

test("Test raw front matter from template (yaml)", async (t) => {
  // https://github.com/jonschlinkert/gray-matter/blob/master/examples/yaml.js
  let tmpl = getNewTemplate(
    "./test/stubs/templateFrontMatter.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.truthy(await tmpl.getInputContent(), "template exists and can be opened.");

  t.is((await tmpl.getFrontMatter()).data.key1, "value1");
  t.is((await tmpl.getFrontMatter()).data.key3, "value3");

  let data = await tmpl.getData();
  t.is(data.key1, "value1");
  t.is(data.key3, "value3");

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "c:value1:value2:value3");
});

test("Test raw front matter from template (json)", async (t) => {
  // https://github.com/jonschlinkert/gray-matter/blob/master/examples/json.js
  let tmpl = getNewTemplate(
    "./test/stubs/templateFrontMatterJson.ejs",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.getFrontMatter()).data.key1, "value1");
  t.is((await tmpl.getFrontMatter()).data.key3, "value3");

  let data = await tmpl.getData();
  t.is(data.key1, "value1");
  t.is(data.key3, "value3");

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "c:value1:value2:value3");
});

test("Test raw front matter from template (js)", async (t) => {
  // https://github.com/jonschlinkert/gray-matter/blob/master/examples/javascript.js
  let tmpl = getNewTemplate(
    "./test/stubs/templateFrontMatterJs.ejs",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.getFrontMatter()).data.key1, "value1");
  t.is((await tmpl.getFrontMatter()).data.key3, "value3");

  let data = await tmpl.getData();
  t.is(data.key1, "value1");
  t.is(data.key3, "value3");

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "c:value1:VALUE2:value3");
});

test("Test that getData() works", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/templateFrontMatter.ejs",
    "./test/stubs/",
    "./dist"
  );
  let data = await tmpl.getData();

  t.is(data.key1, "value1");
  t.is(data.key3, "value3");
});

test("One Layout (using new content var)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/templateWithLayout.ejs",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  t.is(
    (await tmpl.getFrontMatter()).data[tmpl.config.keys.layout],
    "defaultLayout"
  );

  let data = await tmpl.getData();
  t.is(data[tmpl.config.keys.layout], "defaultLayout");

  t.is(
    normalizeNewLines(cleanHtml(await tmpl.renderLayout(tmpl, data))),
    `<div id="layout">
  <p>Hello.</p>
</div>`
  );

  t.is(data.keymain, "valuemain");
  t.is(data.keylayout, "valuelayout");
});

test("One Layout (using layoutContent)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/templateWithLayoutContent.ejs",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  t.is(
    (await tmpl.getFrontMatter()).data[tmpl.config.keys.layout],
    "defaultLayoutLayoutContent"
  );

  let data = await tmpl.getData();
  t.is(data[tmpl.config.keys.layout], "defaultLayoutLayoutContent");

  t.is(
    normalizeNewLines(cleanHtml(await tmpl.renderLayout(tmpl, data))),
    `<div id="layout">
  <p>Hello.</p>
</div>`
  );

  t.is(data.keymain, "valuemain");
  t.is(data.keylayout, "valuelayout");
});

test("One Layout (layouts disabled)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/templateWithLayoutContent.ejs",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  tmpl.setWrapWithLayouts(false);

  t.is(
    (await tmpl.getFrontMatter()).data[tmpl.config.keys.layout],
    "defaultLayoutLayoutContent"
  );

  let data = await tmpl.getData();
  t.is(data[tmpl.config.keys.layout], "defaultLayoutLayoutContent");

  t.is(cleanHtml(await tmpl.render(data)), "<p>Hello.</p>");

  t.is(data.keymain, "valuemain");
  t.is(data.keylayout, "valuelayout");
});

test("One Layout (_layoutContent deprecated but supported)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/templateWithLayoutBackCompat.ejs",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  t.is(
    (await tmpl.getFrontMatter()).data[tmpl.config.keys.layout],
    "defaultLayout_layoutContent"
  );

  let data = await tmpl.getData();
  t.is(data[tmpl.config.keys.layout], "defaultLayout_layoutContent");

  t.is(
    normalizeNewLines(cleanHtml(await tmpl.renderLayout(tmpl, data))),
    `<div id="layout">
  <p>Hello.</p>
</div>`
  );

  t.is(data.keymain, "valuemain");
  t.is(data.keylayout, "valuelayout");
});

test("One Layout (liquid test)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/templateWithLayout.liquid",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  t.is(
    (await tmpl.getFrontMatter()).data[tmpl.config.keys.layout],
    "layoutLiquid.liquid"
  );

  let data = await tmpl.getData();
  t.is(data[tmpl.config.keys.layout], "layoutLiquid.liquid");

  t.is(
    normalizeNewLines(cleanHtml(await tmpl.renderLayout(tmpl, data))),
    `<div id="layout">
  <p>Hello.</p>
</div>`
  );

  t.is(data.keymain, "valuemain");
  t.is(data.keylayout, "valuelayout");
});

test("Two Layouts", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/templateTwoLayouts.ejs",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  t.is((await tmpl.getFrontMatter()).data[tmpl.config.keys.layout], "layout-a");

  let data = await tmpl.getData();
  t.is(data[tmpl.config.keys.layout], "layout-a");
  t.is(data.key1, "value1");

  t.is(
    normalizeNewLines(cleanHtml(await tmpl.renderLayout(tmpl, data))),
    `<div id="layout-b">
  <div id="layout-a">
    <p>value2-a</p>
  </div>
</div>`
  );

  t.is(data.daysPosted, 152);
});

test("Liquid template", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/formatTest.liquid",
    "./test/stubs/",
    "dist",
    dataObj,
    null,
    eleventyConfig
  );

  t.is(await tmpl.render(await tmpl.getData()), "<p>Zach</p>");
});

test("Liquid template with include", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/includer.liquid",
    "./test/stubs/",
    "dist"
  );

  t.is(
    (await tmpl.render(await tmpl.getData())).trim(),
    "<p>This is an include.</p>"
  );
});

test("Permalink output directory", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalinked.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(await tmpl.getOutputPath(), "./dist/permalinksubfolder/index.html");
});

test("Permalink output directory from layout", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-in-layout.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(await tmpl.getOutputPath(), "./dist/hello/index.html");
});

test("Permalink output directory from layout (fileslug)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-in-layout-fileslug.ejs",
    "./test/stubs/",
    "./dist"
  );
  t.is(
    await tmpl.getOutputPath(),
    "./dist/test/permalink-in-layout-fileslug/index.html"
  );
});

test("Layout from template-data-file that has a permalink (fileslug) Issue #121", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-data-layout/test.njk",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  let data = await tmpl.getData();
  let renderedTmpl = (await tmpl.getRenderedTemplates(data))[0];
  t.is(renderedTmpl.templateContent, "Wrapper:Test 1:test");
  t.is(await tmpl.getOutputPath(), "./dist/test/index.html");
});

test("Fileslug in an 11ty.js template Issue #588", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/fileslug.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getData();
  let renderedTmpl = (await tmpl.getRenderedTemplates(data))[0];
  t.is(renderedTmpl.templateContent, "<p>fileslug</p>");
});

test("Local template data file import (without a global data json)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/component/component.njk",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  let data = await tmpl.getData();
  t.deepEqual(await dataObj.getLocalDataPaths(tmpl.getInputPath()), [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/component/component.json",
    "./test/stubs/component/component.11tydata.json",
    "./test/stubs/component/component.11tydata.cjs",
    "./test/stubs/component/component.11tydata.js",
  ]);
  t.is(data.localdatakey1, "localdatavalue1");
  t.is(await tmpl.render(data), "localdatavalue1");
});

test("Local template data file import (two subdirectories deep)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/firstdir/seconddir/component.njk",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  t.deepEqual(await dataObj.getLocalDataPaths(tmpl.getInputPath()), [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/firstdir/firstdir.json",
    "./test/stubs/firstdir/firstdir.11tydata.json",
    "./test/stubs/firstdir/firstdir.11tydata.cjs",
    "./test/stubs/firstdir/firstdir.11tydata.js",
    "./test/stubs/firstdir/seconddir/seconddir.json",
    "./test/stubs/firstdir/seconddir/seconddir.11tydata.json",
    "./test/stubs/firstdir/seconddir/seconddir.11tydata.cjs",
    "./test/stubs/firstdir/seconddir/seconddir.11tydata.js",
    "./test/stubs/firstdir/seconddir/component.json",
    "./test/stubs/firstdir/seconddir/component.11tydata.json",
    "./test/stubs/firstdir/seconddir/component.11tydata.cjs",
    "./test/stubs/firstdir/seconddir/component.11tydata.js",
  ]);
});

test("Posts inherits local JSON, layouts", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/posts/post1.njk",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  let localDataPaths = await dataObj.getLocalDataPaths(tmpl.getInputPath());
  t.deepEqual(localDataPaths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/posts/posts.json",
    "./test/stubs/posts/posts.11tydata.json",
    "./test/stubs/posts/posts.11tydata.cjs",
    "./test/stubs/posts/posts.11tydata.js",
    "./test/stubs/posts/post1.json",
    "./test/stubs/posts/post1.11tydata.json",
    "./test/stubs/posts/post1.11tydata.cjs",
    "./test/stubs/posts/post1.11tydata.js",
  ]);

  let localData = await dataObj.getTemplateDirectoryData(tmpl.getInputPath());
  t.is(localData.layout, "mylocallayout.njk");

  let globalData = await dataObj.getGlobalData();
  t.truthy(globalData.pkg);

  let data = await tmpl.getData();
  t.is(localData.layout, "mylocallayout.njk");

  t.is(
    normalizeNewLines((await tmpl.render(data)).trim()),
    `<div id="locallayout">Post1
</div>`
  );
});

test("Template and folder name are the same, make sure data imports work ok", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/posts/posts.njk",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  let localDataPaths = await dataObj.getLocalDataPaths(tmpl.getInputPath());
  t.deepEqual(localDataPaths, [
    "./test/stubs/stubs.json",
    "./test/stubs/stubs.11tydata.json",
    "./test/stubs/stubs.11tydata.cjs",
    "./test/stubs/stubs.11tydata.js",
    "./test/stubs/posts/posts.json",
    "./test/stubs/posts/posts.11tydata.json",
    "./test/stubs/posts/posts.11tydata.cjs",
    "./test/stubs/posts/posts.11tydata.js",
  ]);

  let localData = await dataObj.getTemplateDirectoryData(tmpl.getInputPath());
  t.is(localData.layout, "mylocallayout.njk");

  let globalData = await dataObj.getGlobalData();
  t.truthy(globalData.pkg);

  let data = await tmpl.getData();
  t.is(localData.layout, "mylocallayout.njk");

  t.is(
    normalizeNewLines((await tmpl.render(data)).trim()),
    `<div id="locallayout">Posts
</div>`
  );
});

test("Clone the template", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/default.ejs",
    "./test/stubs/",
    "./dist"
  );

  let cloned = tmpl.clone();

  t.is(await tmpl.getOutputPath(), "./dist/default/index.html");
  t.is(await cloned.getOutputPath(), "./dist/default/index.html");
  t.is(cloned.extensionMap, tmpl.extensionMap);
});

test("mapDataAsRenderedTemplates", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/default.ejs",
    "./test/stubs/",
    "./dist"
  );

  t.deepEqual(
    await tmpl.mapDataAsRenderedTemplates(
      {
        key1: "value1",
        key2: "value2",
        key3: "value3",
      },
      { parsedKey: "parsedValue" }
    ),
    {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    }
  );

  t.deepEqual(
    await tmpl.mapDataAsRenderedTemplates(
      {
        key1: "value1",
        key2: "<%= parsedKey %>",
      },
      { parsedKey: "parsedValue" }
    ),
    {
      key1: "value1",
      key2: "parsedValue",
    }
  );

  t.deepEqual(
    await tmpl.mapDataAsRenderedTemplates(
      {
        key1: "value1",
        key2: ["<%= parsedKey %>", 2],
      },
      { parsedKey: "parsedValue" }
    ),
    {
      key1: "value1",
      key2: ["parsedValue", 2],
    }
  );
});

test("renderData", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/renderData/renderData.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is((await tmpl.render(data)).trim(), "hi:value2-value1.css");
});

test("renderData markdown (issue #40)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/renderData/renderData.md",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is((await tmpl.render(data)).trim(), "<title>value2-value1.css</title>");
});

test("getMappedDate (empty, assume created)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/dates/file1.md",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  let date = await tmpl.getMappedDate(data);

  t.true(date instanceof Date);
  t.truthy(date.getTime());
});

test("getMappedDate (explicit date, yaml String)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/dates/file2.md",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  let date = await tmpl.getMappedDate(data);

  t.true(date instanceof Date);
  t.truthy(date.getTime());
});

test("getMappedDate (explicit date, yaml Date)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/dates/file2b.md",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  let date = await tmpl.getMappedDate(data);

  t.true(date instanceof Date);
  t.truthy(date.getTime());
});

test("getMappedDate (explicit date, yaml Date and string should be the same)", async (t) => {
  let tmplA = getNewTemplate(
    "./test/stubs/dates/file2.md",
    "./test/stubs/",
    "./dist"
  );
  let dataA = await getRenderedData(tmplA);
  let stringDate = await tmplA.getMappedDate(dataA);

  let tmplB = getNewTemplate(
    "./test/stubs/dates/file2b.md",
    "./test/stubs/",
    "./dist"
  );
  let dataB = await getRenderedData(tmplB);
  let yamlDate = await tmplB.getMappedDate(dataB);

  t.truthy(stringDate);
  t.truthy(yamlDate);
  t.deepEqual(stringDate, yamlDate);
});

test("getMappedDate (modified date)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/dates/file3.md",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  let date = await tmpl.getMappedDate(data);

  t.true(date instanceof Date);
  t.truthy(date.getTime());
});

test("getMappedDate (created date)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/dates/file4.md",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  let date = await tmpl.getMappedDate(data);

  t.true(date instanceof Date);
  t.truthy(date.getTime());
});

test("getMappedDate (falls back to filename date)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/dates/2018-01-01-file5.md",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  let date = await tmpl.getMappedDate(data);

  t.true(date instanceof Date);
  t.truthy(date.getTime());
});

test("getRenderedData() has all the page variables", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);

  t.truthy(data.page.url);
  t.is(data.page.url, "/template/");
  t.is(data.page.fileSlug, "template");
  t.is(data.page.filePathStem, "/template");
  t.truthy(data.page.date.getTime());
  t.is(data.page.inputPath, "./test/stubs/template.ejs");
  t.is(data.page.outputPath, "./dist/template/index.html");
});

test("Issue #603: page.date Liquid", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/pagedate.liquid",
    "./test/stubs/",
    "./dist"
  );
  let data = await tmpl.getData();

  t.truthy(data.page.date);
  t.truthy(data.page.date.toUTCString());

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), data.page.date.toString());
});

test("Issue #603: page.date Nunjucks", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/pagedate.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await tmpl.getData();

  t.truthy(data.page.date);
  t.truthy(data.page.date.toUTCString());

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), data.page.date.toString());
});

test("Issue #603: page.date.toUTCString() Nunjucks", async (t) => {
  // Note this is not supported in Liquid
  let tmpl = getNewTemplate(
    "./test/stubs/pagedateutc.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await tmpl.getData();

  t.truthy(data.page.date);
  t.truthy(data.page.date.toUTCString());

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), data.page.date.toUTCString());
});

test("getTemplates() data has all the root variables", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );
  let data = await tmpl.getData();
  let templates = await tmpl.getTemplates(data);

  t.is(templates[0].url, "/template/");
  t.is(templates[0].fileSlug, "template");
  t.is(templates[0].filePathStem, "/template");
  t.truthy(templates[0].date.getTime());
  t.is(templates[0].inputPath, "./test/stubs/template.ejs");
  t.is(templates[0].outputPath, "./dist/template/index.html");
});

test("getTemplates() data has all the page variables", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );
  let data = await tmpl.getData();
  let templates = await tmpl.getTemplates(data);

  t.is(templates[0].data.page.url, "/template/");
  t.is(templates[0].data.page.fileSlug, "template");
  t.is(templates[0].filePathStem, "/template");
  t.truthy(templates[0].data.page.date.getTime());
  t.is(templates[0].data.page.inputPath, "./test/stubs/template.ejs");
  t.is(templates[0].data.page.outputPath, "./dist/template/index.html");
});

test("getRenderedTemplates() data has all the page variables", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./dist"
  );
  let data = await tmpl.getData();

  let templates = await tmpl.getRenderedTemplates(data);
  t.is(templates[0].data.page.url, "/template/");
  t.is(templates[0].data.page.fileSlug, "template");
  t.is(templates[0].filePathStem, "/template");
  t.truthy(templates[0].data.page.date.getTime());
  t.is(templates[0].data.page.inputPath, "./test/stubs/template.ejs");
  t.is(templates[0].data.page.outputPath, "./dist/template/index.html");
});

test("getRenderedData() has good slug (empty, index)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/index.ejs",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is(data.page.fileSlug, "");
  t.is(data.page.filePathStem, "/index");
});

test("getRenderedData() has good slug", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/includer.liquid",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is(data.page.fileSlug, "includer");
  t.is(data.page.filePathStem, "/includer");
});

test("Override base templating engine from .liquid to ejs", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test-ejs.liquid",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.render(await tmpl.getData())).trim(), "My Title");
});

test("Override base templating engine from markdown to 11ty.js, then markdown", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/test-override-js-markdown.11ty.js",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    (await tmpl.render(await tmpl.getData())).trim(),
    "<h1>This is markdown</h1>"
  );
});

test("Override base templating engine from .liquid to md", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test-md.liquid",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.render(await tmpl.getData())).trim(), "<h1>My Title</h1>");
});

test("Override base templating engine from .liquid to ejs,md", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test-multiple.md",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.render(await tmpl.getData())).trim(), "<h1>My Title</h1>");
});

test("Override base templating engine from .njk to ejs,md", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test-multiple2.njk",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.render(await tmpl.getData())).trim(), "<h1>My Title</h1>");
});

test("Override base templating engine from .html to ejs", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test.html",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.render(await tmpl.getData())).trim(), "<h2>My Title</h2>");
});

test("Override base templating engine from .html to (nothing)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test-empty.html",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    (await tmpl.render(await tmpl.getData())).trim(),
    "<h2><%= title %></h2>"
  );
});

test("Override base templating engine should error with bad string", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test-error.njk",
    "./test/stubs/",
    "./dist"
  );

  await t.throwsAsync(async () => {
    await tmpl.render(await tmpl.getData());
  });
});

test("Override base templating engine (bypasses markdown)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test-bypass.md",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.render(await tmpl.getData())).trim(), "# My Title");
});

test("Override base templating engine to (nothing)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test-empty.md",
    "./test/stubs/",
    "./dist"
  );

  // not parsed
  t.is((await tmpl.render(await tmpl.getData())).trim(), "# <%= title %>");
});

test("Override base templating engine from .ejs to njk", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test.ejs",
    "./test/stubs/",
    "./dist"
  );

  t.is((await tmpl.render(await tmpl.getData())).trim(), "My Title");
});

test("Override base templating engine from .njk to ejs (with a layout that uses njk)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/layout.njk",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    (await tmpl.render(await tmpl.getData())).trim(),
    `<div id="layoutvalue"><h2>My Title</h2></div>`
  );
});

test("Override base templating engine from .njk to nothing (with a layout that uses njk)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/layoutfalse.njk",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    (await tmpl.render(await tmpl.getData())).trim(),
    `<div id="layoutvalue"><h2><%= title %></h2></div>`
  );
});

test("Using a markdown source file (with a layout that uses njk), markdown shouldn’t render in layout file", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test.md",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    normalizeNewLines((await tmpl.render(await tmpl.getData())).trim()),
    `# Layout header

<div id="layoutvalue"><h1>My Title</h1>
</div>`
  );
});

test("Override base templating engine from .md to ejs,md (with a layout that uses njk), markdown shouldn’t render in layout file", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/overrides/test2.md",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    normalizeNewLines((await tmpl.render(await tmpl.getData())).trim()),
    `# Layout header

<div id="layoutvalue"><h1>My Title</h1>
</div>`
  );
});

test("renderContent on a markdown file, permalink should not render markdown", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-markdown.md",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    await tmpl.renderContent("/news/my-test-file/index.html", {}, true),
    "/news/my-test-file/index.html"
  );

  t.is(await tmpl.getRawOutputPath(), "/news/my-test-file/index.html");
});

test("renderContent on a markdown file, permalink should not render markdown (with variable)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-markdown-var.md",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    await tmpl.renderContent(
      "/news/{{ slug }}/index.html",
      { slug: "my-title" },
      true
    ),
    "/news/my-title/index.html"
  );

  t.is(await tmpl.getRawOutputPath(), "/news/my-title/index.html");
});

test("renderContent on a markdown file, permalink should not render markdown (has override)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-markdown-override.md",
    "./test/stubs/",
    "./dist"
  );

  t.is(
    await tmpl.renderContent("/news/my-test-file/index.html", {}, true),
    "/news/my-test-file/index.html"
  );

  t.is(await tmpl.getRawOutputPath(), "/news/my-test-file/index.html");
});

/* Transforms */
test("Test a transform", async (t) => {
  t.plan(2);

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  tmpl.addTransform("transformName", function (content, outputPath) {
    t.true(outputPath.endsWith(".html"));
    return "OVERRIDE BY A TRANSFORM";
  });

  let renders = await tmpl._testCompleteRender();
  t.is(renders[0], "OVERRIDE BY A TRANSFORM");
});

// #789: https://github.com/11ty/eleventy/issues/789
test.skip("Test a transform (does it have inputPath?)", async (t) => {
  t.plan(3);

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  tmpl.addTransform("transformName", function (content, outputPath, inputPath) {
    t.true(outputPath.endsWith(".html"));
    t.true(!!inputPath);
    return "OVERRIDE BY A TRANSFORM";
  });

  let renders = await tmpl._testCompleteRender();
  t.is(renders[0], "OVERRIDE BY A TRANSFORM");
});

test("Test a transform with pages", async (t) => {
  t.plan(5);

  let tmpl = getNewTemplate(
    "./test/stubs/transform-pages/template.njk",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  tmpl.addTransform("transformName", function (content, outputPath) {
    // should run twice, one for each page
    t.true(content.length > 0);
    t.true(outputPath.endsWith(".html"));
    return "OVERRIDE BY A TRANSFORM";
  });

  let renders = await tmpl._testCompleteRender();
  t.is(renders[0], "OVERRIDE BY A TRANSFORM");
});

test("Test a transform with a layout", async (t) => {
  t.plan(3);

  let tmpl = getNewTemplate(
    "./test/stubs-475/transform-layout/transform-layout.njk",
    "./test/stubs-475/",
    "./test/stubs-475/_site"
  );

  tmpl.addTransform("transformName", function (content, outputPath) {
    t.is(content, "<html><body>This is content.</body></html>");
    t.true(outputPath.endsWith(".html"));
    return "OVERRIDE BY A TRANSFORM";
  });

  let renders = await tmpl._testCompleteRender();
  t.is(renders[0], "OVERRIDE BY A TRANSFORM");
});

test("Test a single asynchronous transform", async (t) => {
  t.plan(2);

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  tmpl.addTransform("transformName", async function (content, outputPath) {
    t.true(outputPath.endsWith("template/index.html"));

    return new Promise((resolve) => {
      setTimeout(function (str, outputPath) {
        resolve("OVERRIDE BY A TRANSFORM");
      }, 50);
    });
  });

  let renders = await tmpl._testCompleteRender();
  t.is(renders[0], "OVERRIDE BY A TRANSFORM");
});

test("Test multiple asynchronous transforms", async (t) => {
  t.plan(3);

  let tmpl = getNewTemplate(
    "./test/stubs/template.ejs",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  tmpl.addTransform("transformName", async function (content, outputPath) {
    t.true(outputPath.endsWith("template/index.html"));

    return new Promise((resolve, reject) => {
      setTimeout(function (str, outputPath) {
        resolve("lowercase transform");
      }, 50);
    });
  });

  // uppercase
  tmpl.addTransform("transformName", async function (str, outputPath) {
    t.true(outputPath.endsWith("template/index.html"));

    return new Promise((resolve, reject) => {
      setTimeout(function () {
        resolve(str.toUpperCase());
      }, 50);
    });
  });

  let renders = await tmpl._testCompleteRender();
  t.is(renders[0], "LOWERCASE TRANSFORM");
});

test("Test a linter", async (t) => {
  t.plan(4);

  let tmpl = getNewTemplate(
    "./test/stubs/transform-pages/template.njk",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  tmpl.addLinter(function (str, inputPath, outputPath) {
    t.true(inputPath.endsWith("template.njk"));
    t.true(outputPath.endsWith("index.html"));
  });

  await tmpl._testCompleteRender();
});

test("Front Matter Tags (Single)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/templatetest-frontmatter/single.njk",
    "./test/stubs/",
    "dist"
  );
  let frontmatter = await tmpl.getFrontMatterData();
  t.deepEqual(frontmatter.tags, ["single-tag"]);

  let fulldata = await tmpl.getData();
  t.deepEqual(fulldata.tags, ["single-tag"]);

  let pages = await tmpl.getRenderedTemplates(fulldata);
  t.is(pages[0].templateContent.trim(), "Has single-tag");
});

test("Front Matter Tags (Multiple)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/templatetest-frontmatter/multiple.njk",
    "./test/stubs/",
    "dist"
  );
  let frontmatter = await tmpl.getFrontMatterData();
  t.deepEqual(frontmatter.tags, ["multi-tag", "multi-tag-2"]);

  let fulldata = await tmpl.getData();
  t.deepEqual(fulldata.tags, ["multi-tag", "multi-tag-2"]);

  let pages = await tmpl.getRenderedTemplates(fulldata);
  t.is(pages[0].templateContent.trim(), "Has multi-tag-2");
});

test("Front matter date with quotes (liquid), issue #258", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/frontmatter-date/test.liquid",
    "./test/stubs/",
    "dist"
  );

  let data = await tmpl.getData();
  t.is(data.mydate.toISOString(), "2009-04-15T11:34:34.000Z");

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "2009-04-15");
});

test("Front matter date with quotes (njk), issue #258", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/frontmatter-date/test.njk",
    "./test/stubs/",
    "dist"
  );

  let data = await tmpl.getData();
  t.is(data.mydate.toISOString(), "2009-04-15T00:34:34.000Z");

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "2009-04-15T00:34:34.000Z");
});

test("Data Cascade (Deep merge)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  // Default changed in 1.0
  // eleventyConfig.userConfig.setDataDeepMerge(true);
  let dataObj = new TemplateData("./test/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/data-cascade/template.njk",
    "./test/stubs/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.deepEqual(Object.keys(data).sort(), [
    "datafile",
    "frontmatter",
    "page",
    "parent",
    "pkg",
    "tags",
  ]);

  t.deepEqual(Object.keys(data.parent).sort(), [
    "child",
    "datafile",
    "frontmatter",
  ]);

  t.is(data.parent.child, -2);
});

test("Data Cascade (Shallow merge)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  // Default changed in 1.0
  eleventyConfig.userConfig.setDataDeepMerge(false);
  let dataObj = new TemplateData("./test/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/data-cascade/template.njk",
    "./test/stubs/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.deepEqual(Object.keys(data).sort(), [
    "datafile",
    "frontmatter",
    "page",
    "parent",
    "pkg",
    "tags",
  ]);

  t.deepEqual(Object.keys(data.parent).sort(), ["child", "frontmatter"]);

  t.is(data.parent.child, -2);
});

test("Data Cascade Tag Merge (Deep merge)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  // Default changed in 1.0
  // eleventyConfig.userConfig.setDataDeepMerge(true);
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/data-cascade/template.njk",
    "./test/stubs/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.deepEqual(data.tags.sort(), ["tagA", "tagB", "tagC", "tagD"]);
});

test("Data Cascade Tag Merge (Deep Merge - Deduplication)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  // Default changed in 1.0
  // eleventyConfig.userConfig.setDataDeepMerge(true);
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/data-cascade/template.njk",
    "./test/stubs/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.deepEqual(data.tags.sort(), ["tagA", "tagB", "tagC", "tagD"]);
});

test("Data Cascade Tag Merge (Shallow merge)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  // Default changed in 1.0
  eleventyConfig.userConfig.setDataDeepMerge(false);
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/data-cascade/template.njk",
    "./test/stubs/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.deepEqual(data.tags.sort(), ["tagA", "tagB"]);
});

test('Local data inherits tags string ([tags] vs "tags") Shallow Merge', async (t) => {
  let eleventyConfig = new TemplateConfig();
  // Default changed in 1.0
  eleventyConfig.userConfig.setDataDeepMerge(false);
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/local-data-tags/component.njk",
    "./test/stubs/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.deepEqual(data.tags.sort(), ["tag1", "tag2"]);
});

test('Local data inherits tags string ([tags] vs "tags") Deep Merge', async (t) => {
  let eleventyConfig = new TemplateConfig();
  // Default changed in 1.0
  // eleventyConfig.userConfig.setDataDeepMerge(true);
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  await dataObj.cacheData();

  let tmpl = getNewTemplate(
    "./test/stubs/local-data-tags/component.njk",
    "./test/stubs/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let data = await tmpl.getData();
  t.deepEqual(data.tags.sort(), ["tag1", "tag2", "tag3"]);
});

test("Throws a Premature Template Content Error (njk)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.njk",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error from rendering (njk)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.njk",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let mapEntries = await tmpl.getTemplateMapEntries();
  let pageEntries = await tmpl.getTemplates({
    page: {},
    sample: {
      get templateContent() {
        throw new TemplateContentPrematureUseError(
          "Tried to use templateContent too early (test.njk)"
        );
      },
    },
  });
  let error = await t.throwsAsync(async () => {
    await tmpl.renderPageEntry(mapEntries[0], pageEntries[0]);
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error (liquid)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.liquid",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error (11ty.js)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.11ty.js",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error (pug)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.pug",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error from rendering (pug)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.pug",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let mapEntries = await tmpl.getTemplateMapEntries();
  let pageEntries = await tmpl.getTemplates({
    page: {},
    sample: {
      get templateContent() {
        throw new TemplateContentPrematureUseError(
          "Tried to use templateContent too early (test.pug)"
        );
      },
    },
  });
  let error = await t.throwsAsync(async () => {
    await tmpl.renderPageEntry(mapEntries[0], pageEntries[0]);
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error (md)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error from rendering (md)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let mapEntries = await tmpl.getTemplateMapEntries();
  let pageEntries = await tmpl.getTemplates({
    page: {},
    sample: {
      get templateContent() {
        throw new TemplateContentPrematureUseError(
          "Tried to use templateContent too early (test.md)"
        );
      },
    },
  });
  let error = await t.throwsAsync(async () => {
    await tmpl.renderPageEntry(mapEntries[0], pageEntries[0]);
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error (hbs)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.hbs",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error from rendering (hbs)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.hbs",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let mapEntries = await tmpl.getTemplateMapEntries();
  let pageEntries = await tmpl.getTemplates({
    page: {},
    sample: {
      get templateContent() {
        throw new TemplateContentPrematureUseError(
          "Tried to use templateContent too early (test.hbs)"
        );
      },
    },
  });
  let error = await t.throwsAsync(async () => {
    await tmpl.renderPageEntry(mapEntries[0], pageEntries[0]);
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error (mustache)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.mustache",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error (ejs)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.ejs",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Throws a Premature Template Content Error (haml)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/prematureTemplateContent/test.haml",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await tmpl.getTemplates(data);
  let error = t.throws(() => {
    mapEntries[0].templateContent;
  });
  t.is(EleventyErrorUtil.isPrematureTemplateContentError(error), true);
});

test("Issue 413 weird date format", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs-413/date-frontmatter.md",
    "./test/stubs-413/",
    "./dist"
  );

  let error = await t.throwsAsync(async function () {
    await tmpl.getData();
  });

  t.truthy(
    error.message.indexOf(
      "date front matter value (2019-03-13 20:18:42 +0000) is invalid"
    ) > -1
  );
});

test("Custom Front Matter Parsing Options", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/custom-frontmatter/template.njk",
    "./test/stubs/",
    "./dist"
  );
  tmpl.config.frontMatterParsingOptions = {
    excerpt: true,
  };

  let frontmatter = await tmpl.getFrontMatter();
  t.is(frontmatter.data.front, "hello");
  t.is(frontmatter.data.page.excerpt.trim(), "This is an excerpt.");

  t.is(frontmatter.excerpt.trim(), "This is an excerpt.");
  t.is(
    normalizeNewLines(frontmatter.content.trim()),
    `This is an excerpt.
This is content.`
  );

  let fulldata = await tmpl.getData();
  t.is(fulldata.page.excerpt.trim(), "This is an excerpt.");
});

test("Custom Front Matter Parsing Options (using alias)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/custom-frontmatter/template.njk",
    "./test/stubs/",
    "./dist"
  );
  tmpl.config.frontMatterParsingOptions = {
    excerpt: true,
    excerpt_alias: "my_excerpt",
  };

  let frontmatter = await tmpl.getFrontMatter();
  t.is(frontmatter.data.front, "hello");
  t.is(frontmatter.data.my_excerpt.trim(), "This is an excerpt.");
  t.is(
    normalizeNewLines(frontmatter.content.trim()),
    `This is an excerpt.
This is content.`
  );

  let fulldata = await tmpl.getData();
  t.is(fulldata.my_excerpt.trim(), "This is an excerpt.");
});

test("Custom Front Matter Parsing Options (no newline before excerpt separator)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/custom-frontmatter/template-newline1.njk",
    "./test/stubs/",
    "./dist"
  );
  tmpl.config.frontMatterParsingOptions = {
    excerpt: true,
  };

  let frontmatter = await tmpl.getFrontMatter();
  t.is(frontmatter.data.front, "hello");
  t.is(frontmatter.data.page.excerpt.trim(), "This is an excerpt.");

  t.is(frontmatter.excerpt.trim(), "This is an excerpt.");
  t.is(
    normalizeNewLines(frontmatter.content.trim()),
    `This is an excerpt.
This is content.`
  );

  let fulldata = await tmpl.getData();
  t.is(fulldata.page.excerpt.trim(), "This is an excerpt.");
});

test("Custom Front Matter Parsing Options (no newline after excerpt separator)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/custom-frontmatter/template-newline3.njk",
    "./test/stubs/",
    "./dist"
  );
  tmpl.config.frontMatterParsingOptions = {
    excerpt: true,
  };

  let frontmatter = await tmpl.getFrontMatter();
  t.is(
    normalizeNewLines(frontmatter.content.trim()),
    `This is an excerpt.
This is content.`
  );
});

test("Custom Front Matter Parsing Options (no newlines before or after excerpt separator)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/custom-frontmatter/template-newline2.njk",
    "./test/stubs/",
    "./dist"
  );
  tmpl.config.frontMatterParsingOptions = {
    excerpt: true,
  };

  let frontmatter = await tmpl.getFrontMatter();
  t.is(frontmatter.content.trim(), "This is an excerpt.This is content.");
});

test("Custom Front Matter Parsing Options (html comment separator)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/custom-frontmatter/template-excerpt-comment.njk",
    "./test/stubs/",
    "./dist"
  );
  tmpl.config.frontMatterParsingOptions = {
    excerpt: true,
    excerpt_separator: "<!-- excerpt -->",
  };

  let frontmatter = await tmpl.getFrontMatter();
  t.is(frontmatter.data.front, "hello");
  t.is(frontmatter.data.page.excerpt.trim(), "This is an excerpt.");

  t.is(frontmatter.excerpt.trim(), "This is an excerpt.");
  t.is(
    normalizeNewLines(frontmatter.content.trim()),
    `This is an excerpt.
This is content.`
  );
});

test.skip("Custom Front Matter Parsing Options (using TOML)", async (t) => {
  // Currently fails on Windows, needs https://github.com/jonschlinkert/gray-matter/issues/92
  let toml = require("toml");

  let tmpl = getNewTemplate(
    "./test/stubs/custom-frontmatter/template-toml.njk",
    "./test/stubs/",
    "./dist"
  );
  tmpl.config.frontMatterParsingOptions = {
    engines: {
      toml: toml.parse.bind(toml),
    },
  };

  let frontmatter = await tmpl.getFrontMatter();
  t.deepEqual(frontmatter.data, {
    front: "hello",
  });
  t.is(frontmatter.content.trim(), "This is content.");

  let fulldata = await tmpl.getData();
  t.is(fulldata.front, "hello");
});

test("global variable with dashes Issue #567 (liquid)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/global-dash-variable.liquid",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getData();
  t.is(data["is-it-tasty"], "Yes");

  let pages = await tmpl.getRenderedTemplates(data);
  t.is(pages[0].templateContent.trim(), "Yes");
});

test("Issue #446: Layout has a permalink with a different template language than content", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/layout-permalink-difflang/test.md",
    "./test/stubs/layout-permalink-difflang/",
    "dist"
  );

  let data = await tmpl.getData();
  // this call is needed for page data to be added
  let pages = await tmpl.getRenderedTemplates(data);

  t.is(data.permalink, "/{{ page.fileSlug }}/");
  t.is(data.page.url, "/test/");
});

test("Get Layout Chain", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs-incremental/layout-chain/test.njk",
    "./test/stubs-incremental/layout-chain/",
    "./dist"
  );

  let layoutChain = await tmpl._testGetLayoutChain();
  t.deepEqual(layoutChain, [
    "./test/stubs-incremental/layout-chain/_includes/base.njk",
    "./test/stubs-incremental/layout-chain/_includes/parent.njk",
  ]);
});

test("Engine Singletons", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let map = new EleventyExtensionMap(["njk"], eleventyConfig);
  let tmpl1 = getNewTemplate(
    "./test/stubs/engine-singletons/first.njk",
    "./test/stubs/engine-singletons/",
    "./dist",
    null,
    map,
    eleventyConfig
  );
  let tmpl2 = getNewTemplate(
    "./test/stubs/engine-singletons/second.njk",
    "./test/stubs/engine-singletons/",
    "./dist",
    null,
    map,
    eleventyConfig
  );

  t.deepEqual(tmpl1.engine, tmpl2.engine);
});

test("Make sure layout cache takes new changes during watch (nunjucks)", async (t) => {
  let filePath = "./test/stubs-layout-cache/_includes/include-script-1.js";

  await fsp.writeFile(filePath, `alert("hi");`, { encoding: "utf8" });

  let tmpl = getNewTemplate(
    "./test/stubs-layout-cache/test.njk",
    "./test/stubs-layout-cache/",
    "./dist"
  );

  let data = await tmpl.getData();

  t.is((await tmpl.render(data)).trim(), '<script>alert("hi");</script>');

  await fsp.writeFile(filePath, `alert("bye");`, { encoding: "utf8" });

  eventBus.emit("eleventy.resourceModified", filePath);

  t.is((await tmpl.render(data)).trim(), '<script>alert("bye");</script>');
});

test("Make sure layout cache takes new changes during watch (liquid)", async (t) => {
  let filePath = "./test/stubs-layout-cache/_includes/include-script-2.js";
  await fsp.writeFile(filePath, `alert("hi");`, { encoding: "utf8" });

  let tmpl = getNewTemplate(
    "./test/stubs-layout-cache/test.liquid",
    "./test/stubs-layout-cache/",
    "./dist"
  );

  let data = await tmpl.getData();

  t.is((await tmpl.render(data)).trim(), '<script>alert("hi");</script>');

  await fsp.writeFile(filePath, `alert("bye");`, { encoding: "utf8" });

  eventBus.emit("eleventy.resourceModified", filePath);

  t.is((await tmpl.render(data)).trim(), '<script>alert("bye");</script>');
});

test("Add Extension via Configuration (txt file)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    isIncrementalMatch: function (incrementalFilePath) {
      // do some kind of check
      return this.inputPath === incrementalFilePath;
    },
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  let map = new EleventyExtensionMap([], eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/default.txt",
    "./test/stubs/",
    "./dist",
    null,
    map,
    eleventyConfig
  );

  let extensions = tmpl.getExtensionEntries();
  t.deepEqual(extensions[0].key, "txt");
  t.deepEqual(extensions[0].extension, "txt");

  t.truthy(tmpl.isFileRelevantToThisTemplate("./test/stubs/default.txt"));
  t.falsy(tmpl.isFileRelevantToThisTemplate("./test/stubs/default2.txt"));
  t.falsy(tmpl.isFileRelevantToThisTemplate("./test/stubs/default.njk"));

  t.truthy(
    tmpl.isFileRelevantToThisTemplate("./test/stubs/default.txt", {
      isFullTemplate: true,
    })
  );
  t.falsy(
    tmpl.isFileRelevantToThisTemplate("./test/stubs/default2.txt", {
      isFullTemplate: true,
    })
  );
  t.falsy(
    tmpl.isFileRelevantToThisTemplate("./test/stubs/default.njk", {
      isFullTemplate: true,
    })
  );
});

test("permalink object with build", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-build/permalink-build.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  t.is(await tmpl.getRawOutputPath(), "/url/index.html");
  t.is(await tmpl.getOutputHref(), "/url/");
});

test("permalink object without build", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-nobuild/permalink-nobuild.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  t.is(await tmpl.getRawOutputPath(), false);
  t.is(await tmpl.getOutputPath(), false);
  t.is(await tmpl.getOutputHref(), "/url/");
});

test("permalink object _getLink", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-nobuild/permalink-nobuild.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let link = await tmpl._getLink({
    permalink: {
      serverless: "/serverless/",
    },
  });
  t.is(await link.toOutputPath(), false);
  t.is(await link.toHref(), "/serverless/");

  t.deepEqual(link.getServerlessUrls(), {
    serverless: "/serverless/",
  });
  t.deepEqual(tmpl.getServerlessUrls(), {
    serverless: "/serverless/",
  });

  let link2 = await tmpl._getLink({
    permalink: {
      build: "/build/",
    },
  });
  t.is(await link2.toOutputPath(), "/build/index.html");
  t.is(await link2.toHref(), "/build/");
  t.deepEqual(link2.getServerlessUrls(), {});
  t.deepEqual(tmpl.getServerlessUrls(), {});

  let link3 = await tmpl._getLink({
    permalink: {
      build: "/build/",
      serverless: "/serverless/",
    },
  });
  t.is(await link3.toOutputPath(), "/build/index.html");
  t.is(await link3.toHref(), "/build/");
  t.deepEqual(link3.getServerlessUrls(), {
    serverless: "/serverless/",
  });
  t.deepEqual(tmpl.getServerlessUrls(), {
    serverless: "/serverless/",
  });

  // template syntax
  let link4 = await tmpl._getLink({
    test: "a",
    permalink: {
      build: "/build{{ test }}/",
      serverless: "/serverless{{ test }}/",
    },
  });
  t.is(await link4.toOutputPath(), "/builda/index.html");
  t.is(await link4.toHref(), "/builda/");
  t.deepEqual(link4.getServerlessUrls(), {
    serverless: "/serverlessa/",
  });
  t.deepEqual(tmpl.getServerlessUrls(), {
    serverless: "/serverlessa/",
  });
});

test("permalink object _getLink (array of serverless URLs)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-nobuild/permalink-nobuild.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  // Array of URLs is supported
  let link4 = await tmpl._getLink({
    permalink: {
      serverless: ["/serverless1/", "/serverless2/"],
    },
  });
  t.is(await link4.toOutputPath(), false);
  t.is(await link4.toHref(), "/serverless1/");

  t.deepEqual(link4.getServerlessUrls(), {
    serverless: ["/serverless1/", "/serverless2/"],
  });
  t.deepEqual(tmpl.getServerlessUrls(), {
    serverless: ["/serverless1/", "/serverless2/"],
  });
});

test("permalink object _getLink (array of serverless URLs with template syntax)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-nobuild/permalink-nobuild.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  // Array of URLs is supported
  let link = await tmpl._getLink({
    test: "a",
    permalink: {
      serverless: ["/serverless1{{ test }}/", "/serverless2{{ test }}/"],
    },
  });
  t.is(await link.toOutputPath(), false);
  t.is(await link.toHref(), "/serverless1a/");

  t.deepEqual(link.getServerlessUrls(), {
    serverless: ["/serverless1a/", "/serverless2a/"],
  });
  t.deepEqual(tmpl.getServerlessUrls(), {
    serverless: ["/serverless1a/", "/serverless2a/"],
  });
});

test("Do not resolve page.url from eleventy serverless data", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-build-serverless/permalink-build-serverless.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );
  let fakeData = {
    permalink: {
      serverless: "/serverless/",
    },
  };
  let outputHref = await tmpl.getOutputHref(fakeData);
  t.is(outputHref, "/serverless/");

  let outputLink = await tmpl.getRawOutputPath(fakeData);
  t.is(outputLink, false);

  let outputPath = await tmpl.getOutputPath(fakeData);
  t.is(outputPath, false);

  let { href, rawPath, path } = await tmpl.getOutputLocations(fakeData);
  t.is(href, "/serverless/");
  t.is(rawPath, false);
  t.is(path, false);
});

test("Do not override page.url with serverless url", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-build-serverless/permalink-build-serverless.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );
  let fakeData = {
    permalink: {
      build: "/build/",
      serverless: "/serverless/",
    },
  };

  let outputHref = await tmpl.getOutputHref(fakeData);
  t.is(outputHref, "/build/");

  let outputLink = await tmpl.getRawOutputPath(fakeData);
  t.is(outputLink, "/build/index.html");

  let outputPath = await tmpl.getOutputPath(fakeData);
  t.is(outputPath, "./test/stubs/_site/build/index.html");

  let { href, rawPath, path } = await tmpl.getOutputLocations(fakeData);
  t.is(href, "/build/");
  t.is(rawPath, "/build/index.html");
  t.is(path, "./test/stubs/_site/build/index.html");
});

test("Permalink is an object but an empty object (inherit default behavior)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-empty-object/empty-object.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );
  let data = await tmpl.getData();

  let outputHref = await tmpl.getOutputHref(data);
  t.is(outputHref, "/permalink-empty-object/empty-object/");

  let outputLink = await tmpl.getRawOutputPath(data);
  t.is(outputLink, "permalink-empty-object/empty-object/index.html");

  let outputPath = await tmpl.getOutputPath(data);
  t.is(
    outputPath,
    "./test/stubs/_site/permalink-empty-object/empty-object/index.html"
  );

  let { href, rawPath, path } = await tmpl.getOutputLocations(data);
  t.is(href, "/permalink-empty-object/empty-object/");
  t.is(rawPath, "permalink-empty-object/empty-object/index.html");
  t.is(
    path,
    "./test/stubs/_site/permalink-empty-object/empty-object/index.html"
  );
});
