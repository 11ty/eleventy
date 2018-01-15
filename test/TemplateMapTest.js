import test from "ava";
import Template from "../src/Template";
import TemplateMap from "../src/TemplateMap";

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

test("populating the collection twice should clear the previous values (--watch was making it cumulative)", async t => {
  let tm = new TemplateMap();
  await tm.add(tmpl1);
  await tm.add(tmpl2);

  await tm.cache();
  await tm.cache();

  t.is(tm.getMap().length, 2);
});

test("Active template flags are set properly by `assignActiveTemplate`", async t => {
  let tm = new TemplateMap();
  await tm.add(tmpl1);
  await tm.add(tmpl2);
  let collectionsData = await tm.getCollectionsDataForTemplate(tmpl1);
  t.is(collectionsData.all.length, 2);
  t.true(collectionsData.all[0].active);
  t.false(collectionsData.all[1].active);
});
