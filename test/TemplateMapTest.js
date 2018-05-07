import test from "ava";
import Template from "../src/Template";
import TemplateMap from "../src/TemplateMap";
import TemplateCollection from "../src/TemplateCollection";

let tmpl1 = new Template(
  "./test/stubs/templateMapCollection/test1.md",
  "./test/stubs/",
  "./test/stubs/_site"
);
let tmpl2 = new Template(
  "./test/stubs/templateMapCollection/test2.md",
  "./test/stubs/",
  "./test/stubs/_site"
);
let tmpl4 = new Template(
  "./test/stubs/templateMapCollection/test4.md",
  "./test/stubs/",
  "./test/stubs/_site"
);

test("TemplateMap has collections added", async t => {
  let tm = new TemplateMap();
  await tm.add(tmpl1);
  await tm.add(tmpl2);

  t.is(tm.getMap().length, 2);
  t.is(tm.getCollection().getAll().length, 2);
});


test("TemplateMap compared to Collection API", async t => {
  let tm = new TemplateMap();
  await tm.add(tmpl1);
  await tm.add(tmpl4);

  let map = tm.getMap();
  await tm.cache();
  t.deepEqual(map[0].template, tmpl1);
  t.deepEqual(map[0].data.collections.post[0].template, tmpl1);
  t.deepEqual(map[1].template, tmpl4);
  t.deepEqual(map[1].data.collections.post[1].template, tmpl4);

  let c = new TemplateCollection();
  await c.addTemplate(tmpl1);
  await c.addTemplate(tmpl4);

  let posts = c.getFilteredByTag("post");
  t.is(posts.length, 2);
  t.deepEqual(posts[0].template, tmpl1);
  t.deepEqual(posts[1].template, tmpl4);
});


test("populating the collection twice should clear the previous values (--watch was making it cumulative)", async t => {
  let tm = new TemplateMap();
  await tm.add(tmpl1);
  await tm.add(tmpl2);

  await tm.cache();
  await tm.cache();

  t.is(tm.getMap().length, 2);
});

test("TemplateMap adds collections data and has templateContent values", async t => {
  let tm = new TemplateMap();
  await tm.add(tmpl1);
  await tm.add(tmpl2);

  let map = tm.getMap();
  t.falsy(map[0].templateContent);
  t.falsy(map[1].templateContent);
  t.falsy(map[0].data.collections);
  t.falsy(map[1].data.collections);

  await tm.cache();
  t.truthy(map[0].templateContent);
  t.truthy(map[1].templateContent);
  t.truthy(map[0].data.collections);
  t.truthy(map[1].data.collections);
  t.is(map[0].data.collections.post.length, 1);
  t.is(map[0].data.collections.all.length, 2);
  t.is(map[1].data.collections.post.length, 1);
  t.is(map[1].data.collections.all.length, 2);

  t.is(
    await map[0].template.renderWithoutLayouts(map[0].data),
    map[0].templateContent
  );
  t.is(
    await map[1].template.renderWithoutLayouts(map[1].data),
    map[1].templateContent
  );
});

test("TemplateMap circular references (map without templateContent)", async t => {
  let tm = new TemplateMap();
  await tm.add(
    new Template(
      "./test/stubs/templateMapCollection/test3.md",
      "./test/stubs/",
      "./test/stubs/_site"
    )
  );

  let map = tm.getMap();
  t.falsy(map[0].templateContent);
  t.falsy(map[0].data.collections);

  await tm.cache();
  t.truthy(map[0].templateContent);
  t.truthy(map[0].data.collections);
  t.is(map[0].data.collections.all.length, 1);
  t.is(
    await map[0].template.renderWithoutLayouts(map[0].data),
    map[0].templateContent
  );
});

test("TemplateMap circular references (map.templateContent)", async t => {
  let tm = new TemplateMap();
  await tm.add(
    new Template(
      "./test/stubs/templateMapCollection/templateContent.md",
      "./test/stubs/",
      "./test/stubs/_site"
    )
  );

  let map = tm.getMap();
  t.falsy(map[0].templateContent);
  t.falsy(map[0].data.collections);

  await tm.cache();
  t.truthy(map[0].templateContent);
  t.truthy(map[0].data.collections);
  t.is(map[0].data.collections.all.length, 1);

  // templateContent references are not available inside of templateContent strings
  t.is(map[0].templateContent.trim(), "<h1>Test</h1>");

  // first cached templateContent is available to future render calls (but will not loop in any way).
  t.is(
    (await map[0].template.renderWithoutLayouts(map[0].data)).trim(),
    "<h1>Test</h1>\n<h1>Test</h1>"
  );
});
