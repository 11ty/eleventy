import test from "ava";
import eleventyConfig from "../src/EleventyConfig";

// more in TemplateConfigTest.js

test.cb("Events", t => {
  eleventyConfig.on("testEvent", function(arg1, arg2, arg3) {
    t.is(arg1, "arg1");
    t.is(arg2, "arg2");
    t.is(arg3, "arg3");
    t.end();
  });

  eleventyConfig.emit("testEvent", "arg1", "arg2", "arg3");
});

test("Add Collections", t => {
  eleventyConfig.addCollection("myCollection", function(collection) {});
  t.deepEqual(Object.keys(eleventyConfig.getCollections()), ["myCollection"]);
});

test("Add Collections throws error on key collision", t => {
  eleventyConfig.addCollection("myCollectionCollision", function(
    collection
  ) {});

  t.throws(() => {
    eleventyConfig.addCollection("myCollectionCollision", function(
      collection
    ) {});
  });
});

test("Set manual Pass-through File Copy (single call)", t => {
  eleventyConfig.addPassthroughCopy("img");

  t.is(eleventyConfig.passthroughCopies["img"], true);
});

test("Set manual Pass-through File Copy (chained calls)", t => {
  eleventyConfig
    .addPassthroughCopy("css")
    .addPassthroughCopy("js")
    .addPassthroughCopy({ "./src/static": "static" })
    .addPassthroughCopy({ "./src/empty": "./" });

  t.is(eleventyConfig.passthroughCopies["css"], true);
  t.is(eleventyConfig.passthroughCopies["js"], true);
  t.is(eleventyConfig.passthroughCopies["./src/static"], "static");
  t.is(eleventyConfig.passthroughCopies["./src/empty"], "./");
});

test("Set manual Pass-through File Copy (glob patterns)", t => {
  eleventyConfig.addPassthroughCopy({
    "./src/static/**/*": "renamed",
    "./src/markdown/*.md": ""
  });

  // does not exist
  t.is(eleventyConfig.passthroughCopies["css/**"], undefined);
  t.is(eleventyConfig.passthroughCopies["js/**"], undefined);

  // exists
  t.is(eleventyConfig.passthroughCopies["./src/static/**/*"], "renamed");
  t.is(eleventyConfig.passthroughCopies["./src/markdown/*.md"], "");
});

test("Set Template Formats (string)", t => {
  eleventyConfig.setTemplateFormats("ejs, njk, liquid");
  t.deepEqual(eleventyConfig.templateFormats, ["ejs", "njk", "liquid"]);
});

test("Set Template Formats (array)", t => {
  eleventyConfig.setTemplateFormats(["ejs", "njk", "liquid"]);
  t.deepEqual(eleventyConfig.templateFormats, ["ejs", "njk", "liquid"]);
});

test("Set Template Formats (js passthrough copy)", t => {
  eleventyConfig.setTemplateFormats("ejs, njk, liquid, js");
  t.deepEqual(eleventyConfig.templateFormats, ["ejs", "njk", "liquid", "js"]);
});

test("Set Template Formats (11ty.js)", t => {
  eleventyConfig.setTemplateFormats("ejs, njk, liquid, 11ty.js");
  t.deepEqual(eleventyConfig.templateFormats, [
    "ejs",
    "njk",
    "liquid",
    "11ty.js"
  ]);
});
