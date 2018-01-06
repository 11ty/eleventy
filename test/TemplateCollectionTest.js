import test from "ava";
import Template from "../src/Template";
import Collection from "../src/TemplateCollection";

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

test("Basic setup", async t => {
  let c = new Collection();
  await c.addTemplate(tmpl1);
  await c.addTemplate(tmpl2);
  await c.addTemplate(tmpl3);

  t.is(c.length, 3);
});

test("getFiltered", async t => {
  let c = new Collection();
  await c.addTemplate(tmpl1);
  await c.addTemplate(tmpl2);
  await c.addTemplate(tmpl3);

  let filtered = c.getFiltered(function(item) {
    return item.data && item.data.title;
  });

  t.deepEqual(filtered[0].template, tmpl1);
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

  let posts = c.getFilteredByTag("post", tmpl3);
  t.is(posts.length, 2);
  t.deepEqual(posts[0].template, tmpl1);
  t.deepEqual(posts[1].template, tmpl3);
  t.true(posts[1].active);

  let cats = c.getFilteredByTag("cat", tmpl1);
  t.truthy(cats.length);
  t.is(cats.length, 2);
  t.deepEqual(cats[0].template, tmpl2);
  t.false(cats[0].active);

  let dogs = c.getFilteredByTag("dog", tmpl2);
  t.truthy(dogs.length);
  t.deepEqual(dogs[0].template, tmpl1);
  t.false(dogs[0].active);
});
