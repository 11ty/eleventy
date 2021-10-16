const test = require("ava");
const TemplateData = require("../src/TemplateData");
const getNewTemplate = require("./_getNewTemplateForTests");
const TemplateConfig = require("../src/TemplateConfig");

async function getRenderedData(tmpl, pageNumber = 0) {
  let data = await tmpl.getData();
  let templates = await tmpl.getTemplates(data);
  return templates[pageNumber].data;
}

test("eleventyComputed", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/first.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is((await tmpl.render(data)).trim(), "hi:value2-value1.css");
});

test("eleventyComputed overrides existing value.", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/override.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is(data.key1, "override");
  t.is((await tmpl.render(data)).trim(), "hi:override");
});

test("eleventyComputed overrides existing value and reuses that upstream value", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/override-reuse.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is(data.key1, "over(value1)ride");
  t.is((await tmpl.render(data)).trim(), "hi:over(value1)ride");
});

test("eleventyComputed permalink", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/permalink.njk",
    "./test/stubs/",
    "./dist"
  );
  let templates = await tmpl.getTemplates(await tmpl.getData());
  let data = templates[0].data;
  t.is(data.page.url, "/haha-value1.html");
  t.is(data.page.outputPath, "./dist/haha-value1.html");
  t.is(data.permalink, "haha-value1.html");
  t.is(data.nested.key3, "value1");
  t.is(data.nested.key4, "depends on computed value1");
  t.is(data.dependsOnPage, "depends:/haha-value1.html");
});

test("eleventyComputed simple permalink", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/permalink-simple.njk",
    "./test/stubs/",
    "./dist"
  );
  let templates = await tmpl.getTemplates(await tmpl.getData());
  let data = templates[0].data;
  t.is(data.page.url, "/haha-value1.html");
  t.is(data.page.outputPath, "./dist/haha-value1.html");
  t.is(data.permalink, "haha-value1.html");
});

test("eleventyComputed permalink using slug", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/permalink-slug.njk",
    "./test/stubs/",
    "./dist"
  );
  let templates = await tmpl.getTemplates(await tmpl.getData());
  let data = templates[0].data;
  t.is(data.page.url, "/haha-this-is-a-string.html");
  t.is(data.page.outputPath, "./dist/haha-this-is-a-string.html");
  t.is(data.permalink, "haha-this-is-a-string.html");
});

test("eleventyComputed js front matter (function)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/second.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is(data.key3, "value3-value2-value1.css");
  t.is((await tmpl.render(data)).trim(), "hi:value2-value1.css");
});

test("eleventyComputed js front matter key reuses and overrides", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/third.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is(data.key1, "value2-value1");
  t.is((await tmpl.render(data)).trim(), "hi:value2-value1");
});

test("eleventyComputed true primitive", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/true.njk",
    "./test/stubs/",
    "./dist"
  );
  let data = await getRenderedData(tmpl);
  t.is(data.key1, "value1");
  t.is(data.key2, true);
  t.is(data.key3, false);
  t.is(data.key4, 324);
});

test("eleventyComputed relies on global data", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/eleventyComputed/use-global-data.njk",
    "./test/stubs/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let fetchedData = await tmpl.getData();
  let templates = await tmpl.getTemplates(fetchedData);
  let data = templates[0].data;
  t.is(data.image, "datavalue1");
});

test("eleventyComputed intermixes with global data", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.setDataDeepMerge(true);
  let dataObj = new TemplateData(
    "./test/stubs-computed-global/",
    eleventyConfig
  );

  let tmpl = getNewTemplate(
    "./test/stubs-computed-global/intermix.njk",
    "./test/stubs-computed-global/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  let fetchedData = await tmpl.getData();
  t.truthy(fetchedData.eleventyComputed.image);
  t.truthy(fetchedData.eleventyComputed.image2);
  t.truthy(fetchedData.eleventyComputed.image3);
  t.truthy(fetchedData.eleventyComputed.eleventyNavigation.key);

  let templates = await tmpl.getTemplates(fetchedData);
  let data = templates[0].data;
  t.is(data.image, "first");
  t.is(data.image2, "second");
  t.is(data.image3, "third-global");
  t.is(data.eleventyNavigation.key, "nested-first-global");
});

test("eleventyComputed using symbol parsing on template strings (nunjucks)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs-computed-symbolparse/test.njk",
    "./test/stubs-computed-symbolparse/",
    "./test/stubs-computed-symbolparse/_site"
  );
  tmpl.config.nunjucksFilters.fail = function (str) {
    // Filter expects a certain String format, don’t use the (((11ty))) string hack
    if (!str || str.length !== 1) {
      throw new Error("Expect a one character string");
    }
    return `${str}`;
  };

  let data = await getRenderedData(tmpl);
  t.is(data.a, "a");
  t.is(data.b, "b");
  t.is(data.c, "ab");
});

test("eleventyComputed using symbol parsing on template strings (liquid)", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs-computed-symbolparse/test.liquid",
    "./test/stubs-computed-symbolparse/",
    "./test/stubs-computed-symbolparse/_site"
  );
  tmpl.config.liquidFilters.fail = function (str) {
    // Filter expects a certain String format, don’t use the (((11ty))) string hack
    if (!str || str.length !== 1) {
      throw new Error("Expect a one character string: " + str);
    }
    return `${str}`;
  };

  let data = await getRenderedData(tmpl);
  t.is(data.a, "a");
  t.is(data.b, "b");
  t.is(data.c, "ab");
});

test("eleventyComputed render strings in arrays", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs-computed-array/test.liquid",
    "./test/stubs-computed-array/",
    "./test/stubs-computed-array/_site"
  );

  let data = await getRenderedData(tmpl);
  t.deepEqual(data.array, ["static value", "test"]);
  t.is(data.notArray, "test");
});
