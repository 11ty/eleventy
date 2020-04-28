import test from "ava";
import Template from "../src/Template";
import TemplateData from "../src/TemplateData";
import TemplateMap from "../src/TemplateMap";
import getNewTemplate from "./_getNewTemplate";

test("Computed data can see tag generated collections", async t => {
  let tm = new TemplateMap();

  let dataObj = new TemplateData("./test/stubs-computed-collections/");
  let tmpl = getNewTemplate(
    "./test/stubs-computed-collections/collections.njk",
    "./test/stubs-computed-collections/",
    "./dist",
    dataObj
  );

  await tm.add(tmpl);

  let dataObj2 = new TemplateData("./test/stubs-computed-collections/");
  let tmpl2 = getNewTemplate(
    "./test/stubs-computed-collections/dog.njk",
    "./test/stubs-computed-collections/",
    "./dist",
    dataObj2
  );

  await tm.add(tmpl2);

  await tm.cache();

  let map = tm.getMap();

  t.is(map[0].inputPath.endsWith("collections.njk"), true);

  t.truthy(map[0].data.collections.all);
  t.is(map[0].data.collections.all.length, 2);
  t.truthy(map[0].data.collections.dog);
  t.is(map[0].data.collections.dog.length, 1);
  t.truthy(map[0].data.dogCollection);
  t.is(map[0].data.dogCollection.length, 1);
  t.is(map[0].data.test, "hello");

  // THEY ARE THE SAME
  t.is(map[0].data.dogCollection, map[0].data.collections.dog);
});
