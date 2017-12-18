import test from "ava";
import Template from "../src/Template";
import TemplateData from "../src/TemplateData";
import Pagination from "../src/Plugins/Pagination";

test("Test that getData() works", async t => {
  let dataObj = new TemplateData();
  await dataObj.cacheData();

  let tmpl = new Template(
    "./test/stubs/paged/paged.njk",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  let data = await tmpl.getData();

  t.truthy(data.pagination);
  t.is(data.pagination.data, "items.sub");
  t.is(data.pagination.size, 5);

  // local data
  t.truthy(data.items.sub.length);

  var paging = new Pagination(data);
  paging.setTemplate(tmpl);
  let pages = await paging.getPageTemplates();
  t.is(pages.length, 2);

  t.is(pages[0].getOutputPath(), "./dist/paged/paged/index.html");
  t.is(
    (await pages[0].render()).trim(),
    "<ol><li>item1</li><li>item2</li><li>item3</li><li>item4</li><li>item5</li></ol>"
  );

  t.is(pages[1].getOutputPath(), "./dist/paged/paged/1/index.html");
  t.is(
    (await pages[1].render()).trim(),
    "<ol><li>item6</li><li>item7</li><li>item8</li></ol>"
  );
});
