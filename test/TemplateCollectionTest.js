import test from "ava";
import Template from "../src/Template";
import Collection from "../src/TemplateCollection";
import Sortable from "../src/Util/Sortable";

let tmpl1 = new Template(
  "./test/stubs/collection/test1.md",
  "./test/stubs/",
  "./test/stubs/_site"
);
let tmpl2 = new Template(
  "./test/stubs/collection/test2.md",
  "./test/stubs/",
  "./test/stubs/_site"
);
let tmpl3 = new Template(
  "./test/stubs/collection/test3.md",
  "./test/stubs/",
  "./test/stubs/_site"
);
let tmpl4 = new Template(
  "./test/stubs/collection/test4.md",
  "./test/stubs/",
  "./test/stubs/_site"
);
let tmpl5 = new Template(
  "./test/stubs/collection/test5.md",
  "./test/stubs/",
  "./test/stubs/_site"
);
let tmpl6 = new Template(
  "./test/stubs/collection/test6.html",
  "./test/stubs/",
  "./test/stubs/_site"
);
let tmpl7 = new Template(
  "./test/stubs/collection/test7.njk",
  "./test/stubs/",
  "./test/stubs/_site"
);

test("Basic setup", async t => {
  let c = new Collection();
  await c.addTemplate(tmpl1);
  await c.addTemplate(tmpl2);
  await c.addTemplate(tmpl3);

  t.is(c.length, 3);
});

test("sortFunctionDateInputPath", async t => {
  let c = new Collection();
  await c.addTemplate(tmpl1);
  await c.addTemplate(tmpl4);
  await c.addTemplate(tmpl5);

  let posts = c.sort(Sortable.sortFunctionDateInputPath);
  t.is(posts.length, 3);
  t.deepEqual(posts[0].template, tmpl4);
  t.deepEqual(posts[1].template, tmpl1);
  t.deepEqual(posts[2].template, tmpl5);
});

test("getFilteredByTag", async t => {
  let c = new Collection();
  await c.addTemplate(tmpl1);
  await c.addTemplate(tmpl2);
  await c.addTemplate(tmpl3);

  let posts = c.getFilteredByTag("post");
  t.is(posts.length, 2);
  t.deepEqual(posts[0].template, tmpl1);
  t.deepEqual(posts[1].template, tmpl3);

  let cats = c.getFilteredByTag("cat");
  t.is(cats.length, 2);
  t.deepEqual(cats[0].template, tmpl2);

  let dogs = c.getFilteredByTag("dog");
  t.is(dogs.length, 1);
  t.deepEqual(dogs[0].template, tmpl1);
});

test("getFilteredByTag (added out of order, sorted)", async t => {
  let c = new Collection();
  await c.addTemplate(tmpl3);
  await c.addTemplate(tmpl2);
  await c.addTemplate(tmpl1);

  let posts = c.getFilteredByTag("post");
  t.is(posts.length, 2);
  t.deepEqual(posts[0].template, tmpl1);
  t.deepEqual(posts[1].template, tmpl3);

  let cats = c.getFilteredByTag("cat");
  t.truthy(cats.length);
  t.is(cats.length, 2);
  t.deepEqual(cats[0].template, tmpl2);

  let dogs = c.getFilteredByTag("dog");
  t.truthy(dogs.length);
  t.deepEqual(dogs[0].template, tmpl1);
});

test("getFilteredByGlob", async t => {
  let c = new Collection();
  await c.addTemplate(tmpl1);
  await c.addTemplate(tmpl6);
  await c.addTemplate(tmpl7);

  let markdowns = c.getFilteredByGlob("./**/*.md");
  t.is(markdowns.length, 1);
  t.deepEqual(markdowns[0].template, tmpl1);
});

test("getFilteredByGlob no dash dot", async t => {
  let c = new Collection();
  await c.addTemplate(tmpl1);
  await c.addTemplate(tmpl6);
  await c.addTemplate(tmpl7);

  let markdowns = c.getFilteredByGlob("**/*.md");
  t.is(markdowns.length, 1);
  t.deepEqual(markdowns[0].template, tmpl1);

  let htmls = c.getFilteredByGlob("**/*.{html,njk}");
  t.is(htmls.length, 2);
  t.deepEqual(htmls[0].template, tmpl6);
  t.deepEqual(htmls[1].template, tmpl7);
});

test("partial match on tag string, issue 95", async t => {
  let cat = new Template(
    "./test/stubs/issue-95/cat.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );
  let notacat = new Template(
    "./test/stubs/issue-95/notacat.md",
    "./test/stubs/",
    "./test/stubs/_site"
  );

  let c = new Collection();
  await c.addTemplate(cat);
  await c.addTemplate(notacat);

  let posts = c.getFilteredByTag("cat");
  t.is(posts.length, 1);
});
