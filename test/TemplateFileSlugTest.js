import test from "ava";
import TemplateFileSlug from "../src/TemplateFileSlug";

test("Easy slug", t => {
  let fs = new TemplateFileSlug("./file.html");
  t.is(fs.getSlug(), "file");
});

test("Easy slug with dot", t => {
  let fs = new TemplateFileSlug("./file.test.html");
  t.is(fs.getSlug(), "file.test");
});

test("Easy slug with date", t => {
  let fs = new TemplateFileSlug("./2018-01-01-file.html");
  t.is(fs.getSlug(), "file");
});

test("Easy slug with date and dot in slug", t => {
  let fs = new TemplateFileSlug("./2018-01-01-file.test.html");
  t.is(fs.getSlug(), "file.test");
});

test("Easy slug, index", t => {
  let fs = new TemplateFileSlug("./index.html");
  t.is(fs.getSlug(), "");
});

test("Easy slug with date, index", t => {
  let fs = new TemplateFileSlug("./2018-01-01-index.html");
  t.is(fs.getSlug(), "");
});

/* Directories */

test("Easy slug with dir", t => {
  let fs = new TemplateFileSlug("./test/file.html");
  t.is(fs.getSlug(), "file");
});

test("Easy slug with dot with dir", t => {
  let fs = new TemplateFileSlug("./test/file.test.html");
  t.is(fs.getSlug(), "file.test");
});

test("Easy slug with date with dir", t => {
  let fs = new TemplateFileSlug("./test/2018-01-01-file.html");
  t.is(fs.getSlug(), "file");
});

test("Easy slug with date and dot in slug with dir", t => {
  let fs = new TemplateFileSlug("./test/2018-01-01-file.test.html");
  t.is(fs.getSlug(), "file.test");
});

test("Easy slug, index with dir", t => {
  let fs = new TemplateFileSlug("./test/index.html");
  t.is(fs.getSlug(), "test");
});

test("Easy slug with date, index with dir", t => {
  let fs = new TemplateFileSlug("./test/2018-01-01-index.html");
  t.is(fs.getSlug(), "test");
});

/* Pass Input dir */
test("Easy slug, input dir", t => {
  let fs = new TemplateFileSlug("./file.html", ".");
  t.is(fs.getSlug(), "file");
});

test("Easy slug with dot, input dir", t => {
  let fs = new TemplateFileSlug("./file.test.html", ".");
  t.is(fs.getSlug(), "file.test");
});

test("Easy slug with date, input dir", t => {
  let fs = new TemplateFileSlug("./2018-01-01-file.html", ".");
  t.is(fs.getSlug(), "file");
});

test("Easy slug with date and dot in slug, input dir", t => {
  let fs = new TemplateFileSlug("./2018-01-01-file.test.html", ".");
  t.is(fs.getSlug(), "file.test");
});

test("Easy slug, index, input dir", t => {
  let fs = new TemplateFileSlug("./index.html", ".");
  t.is(fs.getSlug(), "");
});

test("Easy slug with date, index, input dir", t => {
  let fs = new TemplateFileSlug("./2018-01-01-index.html", ".");
  t.is(fs.getSlug(), "");
});

/* Directories and Input Dir */

test("Easy slug with dir and input dir", t => {
  let fs = new TemplateFileSlug("./test/file.html", "./test");
  t.is(fs.getSlug(), "file");
});

test("Easy slug with dot with dir and input dir", t => {
  let fs = new TemplateFileSlug("./test/file.test.html", "./test");
  t.is(fs.getSlug(), "file.test");
});

test("Easy slug with date with dir and input dir", t => {
  let fs = new TemplateFileSlug("./test/2018-01-01-file.html", "./test");
  t.is(fs.getSlug(), "file");
});

test("Easy slug with date and dot in slug with dir and input dir", t => {
  let fs = new TemplateFileSlug("./test/2018-01-01-file.test.html", "./test");
  t.is(fs.getSlug(), "file.test");
});

test("Easy slug, index with dir and input dir", t => {
  let fs = new TemplateFileSlug("./test/index.html", "./test");
  t.is(fs.getSlug(), "");
});

test("Easy slug with date, index with dir and input dir", t => {
  let fs = new TemplateFileSlug("./test/2018-01-01-index.html", "./test");
  t.is(fs.getSlug(), "");
});
