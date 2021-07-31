const test = require("ava");
const TemplateFileSlug = require("../src/TemplateFileSlug");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const TemplateConfig = require("../src/TemplateConfig");

function getNewSlugInstance(path, inputDir) {
  let eleventyConfig = new TemplateConfig();
  let extensionMap = new EleventyExtensionMap([], eleventyConfig);
  let fs = new TemplateFileSlug(path, inputDir, extensionMap);
  return fs;
}

test("Easy slug", (t) => {
  let fs = getNewSlugInstance("./file.html");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/file");
});

test("Easy slug with dot", (t) => {
  let fs = getNewSlugInstance("./file.test.html");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/file.test");
});

test("Easy slug with dot 11ty.js", (t) => {
  let fs = getNewSlugInstance("./file.test.11ty.js");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/file.test");
});

test("Easy slug with date", (t) => {
  let fs = getNewSlugInstance("./2018-01-01-file.html");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/file");
});

test("Easy slug with date and dot in slug", (t) => {
  let fs = getNewSlugInstance("./2018-01-01-file.test.html");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/file.test");
});

test("Easy slug, index", (t) => {
  let fs = getNewSlugInstance("./index.html");
  t.is(fs.getSlug(), "");
  t.is(fs.getFullPathWithoutExtension(), "/index");
});

test("Easy slug with date, index", (t) => {
  let fs = getNewSlugInstance("./2018-01-01-index.html");
  t.is(fs.getSlug(), "");
  t.is(fs.getFullPathWithoutExtension(), "/index");
});

test("Easy slug with only a date and no suffix", (t) => {
  let fs = getNewSlugInstance("./2018-01-01.html");
  t.is(fs.getSlug(), "2018-01-01");
  t.is(fs.getFullPathWithoutExtension(), "/2018-01-01");
});

/* Directories */

test("Easy slug with dir", (t) => {
  let fs = getNewSlugInstance("./test/file.html");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/test/file");
});

test("Easy slug with dot with dir", (t) => {
  let fs = getNewSlugInstance("./test/file.test.html");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/test/file.test");
});

test("Easy slug with date with dir", (t) => {
  let fs = getNewSlugInstance("./test/2018-01-01-file.html");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/test/file");
});

test("Easy slug with date and dot in slug with dir", (t) => {
  let fs = getNewSlugInstance("./test/2018-01-01-file.test.html");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/test/file.test");
});

test("Easy slug, index with dir", (t) => {
  let fs = getNewSlugInstance("./test/index.html");
  t.is(fs.getSlug(), "test");
  t.is(fs.getFullPathWithoutExtension(), "/test/index");
});

test("Easy slug with date, index with dir", (t) => {
  let fs = getNewSlugInstance("./test/2018-01-01-index.html");
  t.is(fs.getSlug(), "test");
  t.is(fs.getFullPathWithoutExtension(), "/test/index");
});

/* Pass Input dir */
test("Easy slug, input dir", (t) => {
  let fs = getNewSlugInstance("./file.html", ".");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/file");
});

test("Easy slug with dot, input dir", (t) => {
  let fs = getNewSlugInstance("./file.test.html", ".");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/file.test");
});

test("Easy slug with date, input dir", (t) => {
  let fs = getNewSlugInstance("./2018-01-01-file.html", ".");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/file");
});

test("Easy slug with date and dot in slug, input dir", (t) => {
  let fs = getNewSlugInstance("./2018-01-01-file.test.html", ".");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/file.test");
});

test("Easy slug, index, input dir", (t) => {
  let fs = getNewSlugInstance("./index.html", ".");
  t.is(fs.getSlug(), "");
  t.is(fs.getFullPathWithoutExtension(), "/index");
});

test("Easy slug with date, index, input dir", (t) => {
  let fs = getNewSlugInstance("./2018-01-01-index.html", ".");
  t.is(fs.getSlug(), "");
  t.is(fs.getFullPathWithoutExtension(), "/index");
});

/* Directories and Input Dir */

test("Easy slug with dir and input dir", (t) => {
  let fs = getNewSlugInstance("./test/file.html", "./test");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/file");
});

test("Easy slug with dot with dir and input dir", (t) => {
  let fs = getNewSlugInstance("./test/file.test.html", "./test");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/file.test");
});

test("Easy slug with date with dir and input dir", (t) => {
  let fs = getNewSlugInstance("./test/2018-01-01-file.html", "./test");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/file");
});

test("Easy slug with date and dot in slug with dir and input dir", (t) => {
  let fs = getNewSlugInstance("./test/2018-01-01-file.test.html", "./test");
  t.is(fs.getSlug(), "file.test");
  t.is(fs.getFullPathWithoutExtension(), "/file.test");
});

test("Easy slug, index with dir and input dir", (t) => {
  let fs = getNewSlugInstance("./test/index.html", "./test");
  t.is(fs.getSlug(), "");
  t.is(fs.getFullPathWithoutExtension(), "/index");
});

test("Easy slug with date, index with dir and input dir", (t) => {
  let fs = getNewSlugInstance("./test/2018-01-01-index.html", "./test");
  t.is(fs.getSlug(), "");
  t.is(fs.getFullPathWithoutExtension(), "/index");
});

test("Easy slug with multiple dirs", (t) => {
  let fs = getNewSlugInstance("./dir1/dir2/dir3/file.html", ".");
  t.is(fs.getSlug(), "file");
  t.is(fs.getFullPathWithoutExtension(), "/dir1/dir2/dir3/file");
});

test("Easy slug with multiple dirs and an index file", (t) => {
  let fs = getNewSlugInstance("./dir1/dir2/dir3/index.html", ".");
  t.is(fs.getSlug(), "dir3");
  t.is(fs.getFullPathWithoutExtension(), "/dir1/dir2/dir3/index");
});
