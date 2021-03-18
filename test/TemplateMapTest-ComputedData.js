const test = require("ava");
const TemplateConfig = require("../src/TemplateConfig");
const TemplateData = require("../src/TemplateData");
const TemplateMap = require("../src/TemplateMap");
const getNewTemplate = require("./_getNewTemplateForTests");

test("Computed data can see tag generated collections", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let tm = new TemplateMap(eleventyConfig);

  let dataObj = new TemplateData(
    "./test/stubs-computed-collections/",
    eleventyConfig
  );
  let tmpl = getNewTemplate(
    "./test/stubs-computed-collections/collections.njk",
    "./test/stubs-computed-collections/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  await tm.add(tmpl);

  let dataObj2 = new TemplateData(
    "./test/stubs-computed-collections/",
    eleventyConfig
  );
  let tmpl2 = getNewTemplate(
    "./test/stubs-computed-collections/dog.njk",
    "./test/stubs-computed-collections/",
    "./dist",
    dataObj2,
    null,
    eleventyConfig
  );

  await tm.add(tmpl2);

  await tm.cache();

  let map = tm.getMap();

  t.is(map[0].inputPath.endsWith("collections.njk"), true);

  t.truthy(map[0].data.collections.all);
  t.is(map[0].data.collections.all.length, 2);
  t.truthy(map[0].data.collections.dog);
  t.is(map[0].data.collections.dog.length, 1);
  t.truthy(map[0].data.dogCollection);
  t.is(map[0].data.dogCollection.length, 1);
  t.is(map[0].data.test, "hello");

  // THEY ARE THE SAME
  t.is(map[0].data.dogCollection, map[0].data.collections.dog);
});

test("Computed data can see paginated data, Issue #1138", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let tm = new TemplateMap(eleventyConfig);

  let dataObj = new TemplateData(
    "./test/stubs-computed-pagination/",
    eleventyConfig
  );
  let tmpl = getNewTemplate(
    "./test/stubs-computed-pagination/paginated.njk",
    "./test/stubs-computed-pagination/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  await tm.add(tmpl);

  let dataObj2 = new TemplateData(
    "./test/stubs-computed-pagination/",
    eleventyConfig
  );
  let tmpl2 = getNewTemplate(
    "./test/stubs-computed-pagination/child.11ty.js",
    "./test/stubs-computed-pagination/",
    "./dist",
    dataObj2,
    null,
    eleventyConfig
  );

  await tm.add(tmpl2);

  await tm.cache();

  let map = tm.getMap();

  t.is(map.length, 2);

  // paginated template tests
  t.is(map[0].inputPath.endsWith("paginated.njk"), true);
  t.is(map[0]._pages.length, 2);

  t.is(map[0]._pages[0].data.venue, "first");
  t.is(map[0]._pages[0].data.title, "first");
  t.is(map[0]._pages[0].url, "/venues/first/");
  t.truthy(map[0]._pages[0].data.collections);
  t.truthy(map[0]._pages[0].data.collections.venue);
  t.is(map[0]._pages[0].data.collections.venue.length, 2);

  t.is(map[0]._pages[1].data.venue, "second");
  t.is(map[0]._pages[1].data.title, "second");
  t.is(map[0]._pages[1].url, "/venues/second/");
  t.truthy(map[0]._pages[1].data.collections.venue);
  t.is(map[0]._pages[1].data.collections.venue.length, 2);

  // consumer of paginated template tests
  t.is(map[1]._pages.length, 1);
  // computed prop from venues
  t.truthy(map[1]._pages[0].data.venues);
  t.is(map[1]._pages[0].data.venues.length, 2);
});

test("Computed data in directory data file consumes data file data, Issue #1137", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let tm = new TemplateMap(eleventyConfig);

  let dataObj = new TemplateData(
    "./test/stubs-computed-dirdata/",
    eleventyConfig
  );
  let tmpl = getNewTemplate(
    "./test/stubs-computed-dirdata/dir/first.11ty.js",
    "./test/stubs-computed-dirdata/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  await tm.add(tmpl);

  let dataObj2 = new TemplateData(
    "./test/stubs-computed-dirdata/",
    eleventyConfig
  );
  let tmpl2 = getNewTemplate(
    "./test/stubs-computed-dirdata/dir/second.11ty.js",
    "./test/stubs-computed-dirdata/",
    "./dist",
    dataObj2,
    null,
    eleventyConfig
  );

  await tm.add(tmpl2);

  await tm.cache();

  let map = tm.getMap();

  t.is(map.length, 2);
  t.is(map[0]._pages[0].data.webmentions, "first");
  t.is(map[1]._pages[0].data.webmentions, "second");
});

test("Computed data can filter collections (and other array methods)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let tm = new TemplateMap(eleventyConfig);

  let dataObj = new TemplateData(
    "./test/stubs-computed-collections-filter/",
    eleventyConfig
  );
  let tmpl = getNewTemplate(
    "./test/stubs-computed-collections-filter/collections.njk",
    "./test/stubs-computed-collections-filter/",
    "./dist",
    dataObj,
    null,
    eleventyConfig
  );

  await tm.add(tmpl);

  let dataObj2 = new TemplateData(
    "./test/stubs-computed-collections-filter/",
    eleventyConfig
  );
  let tmpl2 = getNewTemplate(
    "./test/stubs-computed-collections-filter/dog.njk",
    "./test/stubs-computed-collections-filter/",
    "./dist",
    dataObj2,
    null,
    eleventyConfig
  );

  await tm.add(tmpl2);

  await tm.cache();

  let map = tm.getMap();

  t.is(map[0].inputPath.endsWith("collections.njk"), true);

  t.truthy(map[0].data.collections.all);
  t.is(map[0].data.collections.all.length, 2);
  t.truthy(map[0].data.collections.dog);
  t.is(map[0].data.collections.dog.length, 1);
  t.truthy(map[0].data.dogCollection);
  t.is(map[0].data.dogCollection.length, 1);
  t.is(map[0].data.test, "hello");

  // Deeply equal but not the same per `filter` use.
  t.not(map[0].data.dogCollection, map[0].data.collections.dog);
  t.deepEqual(map[0].data.dogCollection, map[0].data.collections.dog);
});
