import test from "ava";
import Collection from "../src/TemplateCollection";
// import Path from "../src/TemplatePath";

test("Basic setup", t => {
  let c = new Collection();
  t.is(c.isSortAscending(), true);
  t.is(c.isSortNumeric(), false);
});

test("Files without a glob selector throws error", async t => {
  let c = new Collection();
  await t.throws(c.getFiles());
});

test("getFiles", async t => {
  let c = new Collection();
  c.setGlob("./test/stubs/_collection/*.md");

  let files = await c.getFiles();
  t.is(files.length, 3);
  t.is(files[0], "./test/stubs/_collection/test1.md");
  t.is(files[1], "./test/stubs/_collection/test2.md");
  t.is(files[2], "./test/stubs/_collection/test3.md");
});

test("sort functions ascending strings", t => {
  let c = new Collection();
  t.deepEqual(["z", "x", "a"].sort(c.getSortFunction()), ["a", "x", "z"]);
});

test("sort functions descending strings", t => {
  let c = new Collection();
  c.setSortAscending(false);
  t.deepEqual(["z", "g", "x", "a"].sort(c.getSortFunction()), [
    "z",
    "x",
    "g",
    "a"
  ]);
});

test("sort functions ascending numbers", t => {
  let c = new Collection();
  c.setSortNumeric(true);
  t.deepEqual([1, 4, 2, 9, 11, 3].sort(c.getSortFunction()), [
    1,
    2,
    3,
    4,
    9,
    11
  ]);
});

test("sort functions descending numbers", t => {
  let c = new Collection();
  c.setSortNumeric(true);
  c.setSortAscending(false);
  t.deepEqual([1, 4, 2, 9, 11, 3].sort(c.getSortFunction()), [
    11,
    9,
    4,
    3,
    2,
    1
  ]);
});

test("getSortedFiles ascending", async t => {
  let c = new Collection();
  c.setGlob("./test/stubs/_collection/*.md");

  let files = await c.getSortedFiles();
  t.is(files.length, 3);
  t.is(files[0], "./test/stubs/_collection/test1.md");
  t.is(files[1], "./test/stubs/_collection/test2.md");
  t.is(files[2], "./test/stubs/_collection/test3.md");
});

test("getSortedFiles descending", async t => {
  let c = new Collection();
  c.setGlob("./test/stubs/_collection/*.md");
  c.setSortAscending(false);

  let files = await c.getSortedFiles();
  t.is(files.length, 3);
  t.is(files[0], "./test/stubs/_collection/test3.md");
  t.is(files[1], "./test/stubs/_collection/test2.md");
  t.is(files[2], "./test/stubs/_collection/test1.md");
});

test("setDefaultGlobFromTemplatePath", async t => {
  let c = new Collection();
  c.setDefaultGlobFromTemplatePath("./test/stubs/_collection/test2.md");

  let files = await c.getFiles();
  t.is(files.length, 3);
  t.is(files[0], "./test/stubs/_collection/test1.md");
  t.is(files[1], "./test/stubs/_collection/test2.md");
  t.is(files[2], "./test/stubs/_collection/test3.md");
});

test("setDefaultGlobFromTemplatePath constructor", async t => {
  let c = new Collection("./test/stubs/_collection/test2.md");

  let files = await c.getFiles();
  t.is(files.length, 3);
  t.is(files[0], "./test/stubs/_collection/test1.md");
  t.is(files[1], "./test/stubs/_collection/test2.md");
  t.is(files[2], "./test/stubs/_collection/test3.md");
});

test("getTemplatePathIndex (middle)", async t => {
  let c = new Collection("./test/stubs/_collection/test2.md");

  let files = await c.getSortedFiles();
  t.is(c.getTemplatePathIndex(files), 1);
});

test("getTemplatePathIndex (last)", async t => {
  let c = new Collection("./test/stubs/_collection/test3.md");

  let files = await c.getSortedFiles();
  t.is(c.getTemplatePathIndex(files), 2);
});

test("getTemplatePathIndex (first, descending)", async t => {
  let c = new Collection("./test/stubs/_collection/test3.md");
  c.setSortAscending(false);

  let files = await c.getSortedFiles();
  t.is(c.getTemplatePathIndex(files), 0);
});
