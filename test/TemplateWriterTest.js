import fs from "fs-extra";
import test from "ava";
import globby from "globby";
import parsePath from "parse-filepath";
import TemplateWriter from "../src/TemplateWriter";
import TemplatePath from "../src/TemplatePath";
// Not sure why but this import up `ava` and _getTemplate 👀
// import Template from "../src/Template";
import eleventyConfig from "../src/EleventyConfig";

test("Mutually exclusive Input and Output dirs", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"]
  );

  let files = await globby(tw.files);
  t.is(tw.rawFiles.length, 2);
  t.true(files.length > 0);
  t.is(files[0], "./test/stubs/writeTest/test.md");
});

test("Single File Input", async t => {
  let tw = new TemplateWriter("./test/stubs/index.html", "./test/stubs/_site", [
    "ejs",
    "md"
  ]);

  let files = await globby(tw.files);
  t.is(tw.rawFiles.length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./test/stubs/index.html");
});

test("Single File Input", async t => {
  let tw = new TemplateWriter("README.md", "./test/stubs/_site", ["md"]);

  let files = await globby(tw.files);
  t.is(tw.rawFiles.length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./README.md");
});

// TODO make sure if output is a subdir of input dir that they don’t conflict.
test("Output is a subdir of input", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/writeTest",
    "./test/stubs/writeTest/_writeTestSite",
    ["ejs", "md"]
  );

  let files = await globby(tw.files);
  t.is(tw.rawFiles.length, 2);
  t.true(files.length > 0);

  let tmpl = tw._getTemplate(files[0]);
  t.is(tmpl.inputDir, "./test/stubs/writeTest");
  t.is(
    await tmpl.getOutputPath(),
    "./test/stubs/writeTest/_writeTestSite/test/index.html"
  );
});

test(".eleventyignore parsing", t => {
  let ignores = new TemplateWriter.getFileIgnores(
    "./test/stubs/.eleventyignore"
  );
  t.is(ignores.length, 2);
  t.is(ignores[0], "!./test/stubs/ignoredFolder/**");
  t.is(ignores[1], "!./test/stubs/ignoredFolder/ignored.md");
});

test("defaults if passed file name does not exist", t => {
  let ignores = new TemplateWriter.getFileIgnores(
    ".thisfiledoesnotexist",
    "node_modules/"
  );
  t.truthy(ignores.length);
  t.is(ignores[0], "!./node_modules/**");
});

test(".eleventyignore files", async t => {
  let tw = new TemplateWriter("test/stubs", "test/stubs/_site", ["ejs", "md"]);
  let ignoredFiles = await globby("test/stubs/ignoredFolder/*.md");
  t.is(ignoredFiles.length, 1);

  let files = await globby(tw.files);
  t.true(files.length > 0);

  t.is(
    files.filter(file => {
      return file.indexOf("./test/stubs/ignoredFolder") > -1;
    }).length,
    0
  );
});

test("_createTemplateMap", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"]
  );

  let paths = await tw._getAllPaths();
  t.true(paths.length > 0);

  let templateMap = await tw._createTemplateMap(paths);
  let map = templateMap.getMap();
  t.true(map.length > 0);
  t.truthy(map[0].template);
  t.truthy(map[0].data);
});

test("getCollectionsDataForTemplate", async t => {
  let tw = new TemplateWriter("./test/stubs/collection", "./test/stubs/_site", [
    "md"
  ]);

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  let collectionsData = await templateMap.getCollectionsDataForTemplate();
  t.is(collectionsData.post.length, 2);
  t.is(collectionsData.cat.length, 2);
  t.is(collectionsData.dog.length, 1);
});

test("_getAllTags", async t => {
  let tw = new TemplateWriter("./test/stubs/collection", "./test/stubs/_site", [
    "md"
  ]);

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  let tags = templateMap.getAllTags();

  t.deepEqual(tags.sort(), ["cat", "dog", "post"].sort());
});

test("Collection of files sorted by date", async t => {
  let tw = new TemplateWriter("./test/stubs/dates", "./test/stubs/_site", [
    "md"
  ]);

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  let collectionsData = await templateMap.getCollectionsDataForTemplate();
  t.is(collectionsData.dateTestTag.length, 6);
});

test("_getCollectionsData with custom collection (ascending)", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/collection2",
    "./test/stubs/_site",
    ["md"]
  );

  eleventyConfig.addCollection("customPostsAsc", function(collection) {
    return collection.getFilteredByTag("post").sort(function(a, b) {
      return a.date - b.date;
    });
  });

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  let collectionsData = await templateMap.getCollectionsDataForTemplate();
  t.is(collectionsData.customPostsAsc.length, 2);
  t.is(parsePath(collectionsData.customPostsAsc[0].inputPath).base, "test1.md");
  t.is(parsePath(collectionsData.customPostsAsc[1].inputPath).base, "test2.md");
});

test("_getCollectionsData with custom collection (descending)", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/collection2",
    "./test/stubs/_site",
    ["md"]
  );

  eleventyConfig.addCollection("customPosts", function(collection) {
    return collection.getFilteredByTag("post").sort(function(a, b) {
      return b.date - a.date;
    });
  });

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  let collectionsData = await templateMap.getCollectionsDataForTemplate();
  t.is(collectionsData.customPosts.length, 2);
  t.is(parsePath(collectionsData.customPosts[0].inputPath).base, "test2.md");
  t.is(parsePath(collectionsData.customPosts[1].inputPath).base, "test1.md");
});

test("_getCollectionsData with custom collection (filter only to markdown input)", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/collection2",
    "./test/stubs/_site",
    ["md"]
  );

  eleventyConfig.addCollection("onlyMarkdown", function(collection) {
    return collection.getAllSorted().filter(function(item) {
      let extension = item.inputPath.split(".").pop();
      return extension === "md";
    });
  });

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  let collectionsData = await templateMap.getCollectionsDataForTemplate();
  t.is(collectionsData.onlyMarkdown.length, 2);
  t.is(parsePath(collectionsData.onlyMarkdown[0].inputPath).base, "test1.md");
  t.is(parsePath(collectionsData.onlyMarkdown[1].inputPath).base, "test2.md");
});

test("Pagination with a Collection", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/paged/collection",
    "./test/stubs/_site",
    ["njk"]
  );

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  await templateMap.cache();

  let collectionsData = await templateMap.getCollectionsDataForTemplate();
  t.is(collectionsData.tag1.length, 3);
  t.is(collectionsData.pagingtag.length, 1);

  let mapEntry = templateMap.getMapEntryForPath(
    "./test/stubs/paged/collection/main.njk"
  );
  t.truthy(mapEntry);
  t.is(mapEntry.inputPath, "./test/stubs/paged/collection/main.njk");

  let mainTmpl = tw._getTemplate("./test/stubs/paged/collection/main.njk");
  let outputPath = await mainTmpl.getOutputPath();
  t.is(outputPath, "./test/stubs/_site/main/index.html");
  t.is(mapEntry.outputPath, "./test/stubs/_site/main/index.html");

  let templates = await mapEntry.template.getRenderedTemplates(
    mapEntry.outputPath,
    mapEntry.data
  );
  t.is(templates.length, 2);
  t.is(
    await templates[0].template.getOutputPath(),
    "./test/stubs/_site/main/index.html"
  );
  t.is(templates[0].outputPath, "./test/stubs/_site/main/index.html");
  t.is(
    await templates[1].template.getOutputPath(),
    "./test/stubs/_site/main/1/index.html"
  );
  t.is(templates[1].outputPath, "./test/stubs/_site/main/1/index.html");

  // test content
  t.is(
    templates[0].templateContent.trim(),
    "<ol><li>/test1/</li><li>/test2/</li></ol>"
  );
  t.is(templates[1].templateContent.trim(), "<ol><li>/test3/</li></ol>");
});

test("Use a collection inside of a template", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/collection-template",
    "./test/stubs/collection-template/_site",
    ["ejs"]
  );

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  await templateMap.cache();

  let collectionsData = await templateMap.getCollectionsDataForTemplate();
  t.is(collectionsData.dog.length, 1);

  let mapEntry = templateMap.getMapEntryForPath(
    "./test/stubs/collection-template/template.ejs"
  );
  t.truthy(mapEntry);
  t.is(mapEntry.inputPath, "./test/stubs/collection-template/template.ejs");

  let mainTmpl = tw._getTemplate(
    "./test/stubs/collection-template/template.ejs"
  );
  let outputPath = await mainTmpl.getOutputPath();
  t.is(
    outputPath,
    "./test/stubs/collection-template/_site/template/index.html"
  );

  let templates = await mapEntry.template.getRenderedTemplates(
    mapEntry.outputPath,
    mapEntry.data
  );

  // test content
  t.is(
    templates[0].templateContent.trim(),
    `Layout

Template

Template 1 dog`
  );
});

test("Use a collection inside of a layout", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/collection-layout",
    "./test/stubs/collection-layout/_site",
    ["ejs"]
  );

  let paths = await tw._getAllPaths();
  let templateMap = await tw._createTemplateMap(paths);
  await templateMap.cache();

  let collectionsData = await templateMap.getCollectionsDataForTemplate();
  t.is(collectionsData.dog.length, 1);

  let mapEntry = templateMap.getMapEntryForPath(
    "./test/stubs/collection-layout/template.ejs"
  );
  t.truthy(mapEntry);
  t.is(mapEntry.inputPath, "./test/stubs/collection-layout/template.ejs");

  let mainTmpl = tw._getTemplate("./test/stubs/collection-layout/template.ejs");
  let outputPath = await mainTmpl.getOutputPath();
  t.is(outputPath, "./test/stubs/collection-layout/_site/template/index.html");

  let templates = await mapEntry.template.getRenderedTemplates(
    mapEntry.outputPath,
    mapEntry.data
  );

  // test content
  t.is(
    templates[0].templateContent.trim(),
    `Layout

Template

Layout 1 dog`
  );
});
