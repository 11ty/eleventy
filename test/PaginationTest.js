import test from "ava";
import Template from "../src/Template";
import TemplateData from "../src/TemplateData";
import Pagination from "../src/Plugins/Pagination";

test("No data passed to pagination", async t => {
  let tmpl = new Template(
    "./test/stubs/paged/notpaged.njk",
    "./test/stubs/",
    "./dist"
  );

  let paging = new Pagination();
  paging.setTemplate(tmpl);

  t.is(paging.getPagedItems().length, 0);
  t.is((await paging.getTemplates()).length, 0);
});

test("No pagination", async t => {
  let tmpl = new Template(
    "./test/stubs/paged/notpaged.njk",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getData();
  let paging = new Pagination(data);
  paging.setTemplate(tmpl);

  t.falsy(data.pagination);
  t.is(paging.getPagedItems().length, 0);
  t.is((await paging.getTemplates()).length, 0);
});

test("Pagination enabled in frontmatter", async t => {
  let tmpl = new Template(
    "./test/stubs/paged/pagedresolve.njk",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getData();
  let paging = new Pagination(data);
  paging.setTemplate(tmpl);

  t.truthy(data.testdata);
  t.truthy(data.testdata.sub);

  t.truthy(data.pagination);
  t.is(data.pagination.data, "testdata.sub");
  t.is(data.pagination.size, 4);
});

test("Resolve paged data in frontmatter", async t => {
  let tmpl = new Template(
    "./test/stubs/paged/pagedresolve.njk",
    "./test/stubs/",
    "./dist"
  );

  let paging = new Pagination(await tmpl.getData());
  paging.setTemplate(tmpl);
  t.is(paging._resolveItems().length, 8);
  t.is(paging.getPagedItems().length, 2);
});

test("Paginate data in frontmatter", async t => {
  let tmpl = new Template(
    "./test/stubs/paged/pagedinlinedata.njk",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getData();
  let paging = new Pagination(data);
  paging.setTemplate(tmpl);
  let pages = await paging.getTemplates();
  t.is(pages.length, 2);

  t.is(
    await pages[0].getOutputPath(),
    "./dist/paged/pagedinlinedata/index.html"
  );
  t.is(
    (await pages[0].render()).trim(),
    "<ol><li>item1</li><li>item2</li><li>item3</li><li>item4</li></ol>"
  );

  t.is(
    await pages[1].getOutputPath(),
    "./dist/paged/pagedinlinedata/1/index.html"
  );
  t.is(
    (await pages[1].render()).trim(),
    "<ol><li>item5</li><li>item6</li><li>item7</li><li>item8</li></ol>"
  );
});

test("Paginate external data file", async t => {
  let dataObj = new TemplateData();
  await dataObj.cacheData();

  let tmpl = new Template(
    "./test/stubs/paged/paged.njk",
    "./test/stubs/",
    "./dist",
    dataObj
  );

  let data = await tmpl.getData();

  // local data
  t.truthy(data.items.sub.length);

  let paging = new Pagination(data);
  paging.setTemplate(tmpl);
  let pages = await paging.getTemplates();
  t.is(pages.length, 2);

  t.is(await pages[0].getOutputPath(), "./dist/paged/index.html");
  t.is(
    (await pages[0].render()).trim(),
    "<ol><li>item1</li><li>item2</li><li>item3</li><li>item4</li><li>item5</li></ol>"
  );

  t.is(await pages[1].getOutputPath(), "./dist/paged/1/index.html");
  t.is(
    (await pages[1].render()).trim(),
    "<ol><li>item6</li><li>item7</li><li>item8</li></ol>"
  );
});

test("Permalink with pagination variables", async t => {
  let tmpl = new Template(
    "./test/stubs/paged/pagedpermalink.njk",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getData();
  let paging = new Pagination(data);
  paging.setTemplate(tmpl);
  let pages = await paging.getTemplates();

  t.is(
    await pages[0].getOutputPath(),
    "./dist/paged/slug-candidate/index.html"
  );
  t.is(
    await pages[1].getOutputPath(),
    "./dist/paged/another-slug-candidate/index.html"
  );
});

test("Permalink with pagination variables (numeric)", async t => {
  let tmpl = new Template(
    "./test/stubs/paged/pagedpermalinknumeric.njk",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getData();
  let paging = new Pagination(data);
  paging.setTemplate(tmpl);
  let pages = await paging.getTemplates();

  let page0Data = await pages[0].getData();
  t.is(await pages[0].getOutputPath(), "./dist/paged/page-0/index.html");
  t.falsy(page0Data.pagination.previousPageLink);
  t.is(page0Data.pagination.nextPageLink, "/paged/page-1/index.html");
  t.is(page0Data.pagination.pageLinks.length, 2);

  let page1Data = await pages[1].getData();
  t.is(await pages[1].getOutputPath(), "./dist/paged/page-1/index.html");
  t.is(page1Data.pagination.previousPageLink, "/paged/page-0/index.html");
  t.falsy(page1Data.pagination.nextPageLink);
  t.is(page1Data.pagination.pageLinks.length, 2);
});

test("Permalink with pagination variables (numeric, one indexed)", async t => {
  let tmpl = new Template(
    "./test/stubs/paged/pagedpermalinknumericoneindexed.njk",
    "./test/stubs/",
    "./dist"
  );

  let data = await tmpl.getData();
  let paging = new Pagination(data);
  paging.setTemplate(tmpl);
  let pages = await paging.getTemplates();

  let page0Data = await pages[0].getData();
  t.is(await pages[0].getOutputPath(), "./dist/paged/page-1/index.html");
  t.falsy(page0Data.pagination.previousPageLink);
  t.is(page0Data.pagination.nextPageLink, "/paged/page-2/index.html");
  t.is(page0Data.pagination.pageLinks.length, 2);

  let page1Data = await pages[1].getData();
  t.is(await pages[1].getOutputPath(), "./dist/paged/page-2/index.html");
  t.is(page1Data.pagination.previousPageLink, "/paged/page-1/index.html");
  t.falsy(page1Data.pagination.nextPageLink);
  t.is(page1Data.pagination.pageLinks.length, 2);
});
