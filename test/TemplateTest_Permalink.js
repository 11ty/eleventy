const test = require("ava");
const fs = require("fs");
const TemplateConfig = require("../src/TemplateConfig");
const TemplateData = require("../src/TemplateData");

const getNewTemplate = require("./_getNewTemplateForTests");

async function writeMapEntries(mapEntries) {
  let promises = [];
  for (let entry of mapEntries) {
    if (entry.template.behavior.isWriteable()) {
      promises.push(
        entry.template._write(entry.outputPath, entry.templateContent)
      );
    }
  }
  return Promise.all(promises);
}

async function getTemplateMapEntriesWithContent(template, data) {
  let entries = await template.getTemplateMapEntries(data);

  return Promise.all(
    entries.map(async (entry) => {
      entry._pages = await entry.template.getTemplates(entry.data);
      await Promise.all(
        entry._pages.map(async (page) => {
          page.templateContent = await entry.template.getTemplateMapContent(
            page
          );
          return page;
        })
      );
      return entry;
    })
  );
}

test("permalink: false", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-false/test.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();

  let mapEntries = await getTemplateMapEntriesWithContent(tmpl, data);
  for (let entry of mapEntries) {
    t.is(entry.template.behavior.isWriteable(), false);
    t.is(entry.data.page.url, false);
    t.is(entry.data.page.outputPath, false);
  }

  await writeMapEntries(mapEntries);

  // Input file exists (sanity check for paths)
  t.is(fs.existsSync("./test/stubs/permalink-false/"), true);
  t.is(fs.existsSync("./test/stubs/permalink-false/test.md"), true);

  // Output does not exist
  t.is(fs.existsSync("./test/stubs/_site/permalink-false/"), false);
  t.is(fs.existsSync("./test/stubs/_site/permalink-false/test/"), false);
  t.is(
    fs.existsSync("./test/stubs/_site/permalink-false/test/index.html"),
    false
  );
});

test("permalink: false inside of eleventyComputed, Issue #1754", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-false-computed/test.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  let mapEntries = await getTemplateMapEntriesWithContent(tmpl, data);
  for (let entry of mapEntries) {
    t.is(entry.template.behavior.isWriteable(), false);
    t.is(entry.data.page.url, false);
    t.is(entry.data.page.outputPath, false);
  }
  await writeMapEntries(mapEntries);

  // Input file exists (sanity check for paths)
  t.is(fs.existsSync("./test/stubs/permalink-false-computed/"), true);
  t.is(fs.existsSync("./test/stubs/permalink-false-computed/test.md"), true);

  // Output does not exist
  t.is(fs.existsSync("./test/stubs/_site/permalink-false-computed/"), false);
  t.is(
    fs.existsSync("./test/stubs/_site/permalink-false-computed/test/"),
    false
  );
  t.is(
    fs.existsSync(
      "./test/stubs/_site/permalink-false-computed/test/index.html"
    ),
    false
  );
});

test("permalink: true", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalink-true/permalink-true.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let data = await tmpl.getData();
  await t.throwsAsync(async () => {
    await tmpl.getOutputLink(data);
  });
});

test("Disable dynamic permalinks", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/dynamic-permalink/test.njk",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  t.is(await tmpl.getOutputLink(), "/{{justastring}}/index.html");
  t.is(await tmpl.getOutputHref(), "/{{justastring}}/");
});


test("Permalink with variables!", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalinkdata.njk",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/subdir/slug-candidate/index.html");
});

test("Permalink with variables and JS front matter!", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalinkdata-jsfn.njk",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/subdir/slug/index.html");
});

// This is broken right now, permalink must use the same template language as the template
test.skip("Use a JavaScript function for permalink in any template language", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalinkdata-jspermalinkfn.njk",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/subdir/slug/index.html");
});

test("Permalink with dates!", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/permalinkdate.liquid",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/2016/01/01/index.html");
});

test("Permalink with dates on file name regex!", async (t) => {
  let tmpl = getNewTemplate(
    "./test/stubs/2016-02-01-permalinkdate.liquid",
    "./test/stubs/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/2016/02/01/index.html");
});

test("Reuse permalink in directory specific data file", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let dataObj = new TemplateData("./test/stubs/", eleventyConfig);
  let tmpl = getNewTemplate(
    "./test/stubs/reuse-permalink/test1.liquid",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  t.is(await tmpl.getOutputPath(), "./dist/2016/01/01/index.html");
});

test("Using slugify filter!", async (t) => {
  let tmpl = getNewTemplate(
    "./test/slugify-filter/test.njk",
    "./test/slugify-filter/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/subdir/slug-love-candidate-lyublyu/index.html");
});

test("Using slugify filter with comma", async (t) => {
  let tmpl = getNewTemplate(
    "./test/slugify-filter/comma.njk",
    "./test/slugify-filter/",
    "./dist"
  );

  t.is(await tmpl.getOutputPath(), "./dist/subdir/hi-i-m-zach/index.html");
});
