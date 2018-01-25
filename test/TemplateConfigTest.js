import test from "ava";
import TemplateConfig from "../src/TemplateConfig";
import eleventyConfig from "../src/EleventyConfig";

test("Template Config local config overrides base config", async t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.markdownTemplateEngine, "ejs");
  t.is(cfg.templateFormats.join(","), "md,njk");

  // merged, not overwritten
  t.true(Object.keys(cfg.keys).length > 1);
  t.truthy(Object.keys(cfg.handlebarsHelpers).length);
  t.truthy(Object.keys(cfg.nunjucksFilters).length);

  t.is(Object.keys(cfg.filters).length, 1);

  t.is(
    cfg.filters.prettyHtml(
      `<html><body><div></div></body></html>`,
      "test.html"
    ),
    `<html>
  <body>
    <div></div>
  </body>
</html>`
  );
});

test("Add liquid tag", t => {
  eleventyConfig.addLiquidTag("myTagName", function() {}, function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidTags).indexOf("myTagName"), -1);
});

test("Add liquid filter", t => {
  eleventyConfig.addLiquidFilter("myFilterName", function() {}, function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidFilters).indexOf("myFilterName"), -1);
});

test("Add handlebars helper", t => {
  eleventyConfig.addHandlebarsHelper("myHelperName", function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.handlebarsHelpers).indexOf("myHelperName"), -1);
});

test("Add nunjucks filter", t => {
  eleventyConfig.addNunjucksFilter(
    "myFilterName",
    function() {},
    function() {}
  );

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test("Add universal filter", t => {
  eleventyConfig.addFilter("myFilterName", function() {}, function() {});

  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();
  t.not(Object.keys(cfg.liquidFilters).indexOf("myFilterName"), -1);
  t.not(Object.keys(cfg.handlebarsHelpers).indexOf("myFilterName"), -1);
  t.not(Object.keys(cfg.nunjucksFilters).indexOf("myFilterName"), -1);
});

test("Test url universal filter with passthrough urls", t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  // via https://gist.github.com/mxpv/034933deeebb26b62f14
  t.is(
    cfg.liquidFilters.url("http://foo.com/blah_blah", ""),
    "http://foo.com/blah_blah"
  );
  t.is(
    cfg.liquidFilters.url("http://foo.com/blah_blah/", ""),
    "http://foo.com/blah_blah/"
  );
  t.is(
    cfg.liquidFilters.url("http://foo.com/blah_blah_(wikipedia)", ""),
    "http://foo.com/blah_blah_(wikipedia)"
  );
  t.is(
    cfg.liquidFilters.url("http://foo.com/blah_blah_(wikipedia)_(again)", ""),
    "http://foo.com/blah_blah_(wikipedia)_(again)"
  );
  t.is(
    cfg.liquidFilters.url("http://www.example.com/wpstyle/?p=364", ""),
    "http://www.example.com/wpstyle/?p=364"
  );
  t.is(
    cfg.liquidFilters.url(
      "https://www.example.com/foo/?bar=baz&inga=42&quux",
      ""
    ),
    "https://www.example.com/foo/?bar=baz&inga=42&quux"
  );
  t.is(
    cfg.liquidFilters.url("http://userid:password@example.com:8080", ""),
    "http://userid:password@example.com:8080"
  );
  t.is(
    cfg.liquidFilters.url("http://userid:password@example.com:8080/", ""),
    "http://userid:password@example.com:8080/"
  );
  t.is(
    cfg.liquidFilters.url("http://userid@example.com", ""),
    "http://userid@example.com"
  );
  t.is(
    cfg.liquidFilters.url("http://userid@example.com/", ""),
    "http://userid@example.com/"
  );
  t.is(
    cfg.liquidFilters.url("http://userid@example.com:8080", ""),
    "http://userid@example.com:8080"
  );
  t.is(
    cfg.liquidFilters.url("http://userid@example.com:8080/", ""),
    "http://userid@example.com:8080/"
  );
  t.is(
    cfg.liquidFilters.url("http://userid:password@example.com", ""),
    "http://userid:password@example.com"
  );
  t.is(
    cfg.liquidFilters.url("http://userid:password@example.com/", ""),
    "http://userid:password@example.com/"
  );
  t.is(cfg.liquidFilters.url("http://142.42.1.1/", ""), "http://142.42.1.1/");
  t.is(
    cfg.liquidFilters.url("http://142.42.1.1:8080/", ""),
    "http://142.42.1.1:8080/"
  );
  t.is(
    cfg.liquidFilters.url("http://foo.com/blah_(wikipedia)#cite-1", ""),
    "http://foo.com/blah_(wikipedia)#cite-1"
  );
  t.is(
    cfg.liquidFilters.url("http://foo.com/blah_(wikipedia)_blah#cite-1", ""),
    "http://foo.com/blah_(wikipedia)_blah#cite-1"
  );
  t.is(
    cfg.liquidFilters.url("http://foo.com/(something)?after=parens", ""),
    "http://foo.com/(something)?after=parens"
  );
  t.is(
    cfg.liquidFilters.url(
      "http://code.google.com/events/#&product=browser",
      ""
    ),
    "http://code.google.com/events/#&product=browser"
  );
  t.is(cfg.liquidFilters.url("http://j.mp", ""), "http://j.mp");
  t.is(cfg.liquidFilters.url("ftp://foo.bar/baz", ""), "ftp://foo.bar/baz");
  t.is(
    cfg.liquidFilters.url("http://foo.bar/?q=Test%20URL-encoded%20stuff", ""),
    "http://foo.bar/?q=Test%20URL-encoded%20stuff"
  );
  t.is(
    cfg.liquidFilters.url(
      "http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com",
      ""
    ),
    "http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com"
  );
  t.is(cfg.liquidFilters.url("http://1337.net", ""), "http://1337.net");
  t.is(cfg.liquidFilters.url("http://a.b-c.de", ""), "http://a.b-c.de");
  t.is(
    cfg.liquidFilters.url("http://223.255.255.254", ""),
    "http://223.255.255.254"
  );

  // these tests were failing without the http/https bypass—upstream issues with valid-url
  t.is(cfg.liquidFilters.url("http://✪df.ws/123", ""), "http://✪df.ws/123");
  t.is(cfg.liquidFilters.url("http://➡.ws/䨹", ""), "http://➡.ws/䨹");
  t.is(cfg.liquidFilters.url("http://⌘.ws", ""), "http://⌘.ws");
  t.is(cfg.liquidFilters.url("http://⌘.ws/", ""), "http://⌘.ws/");
  t.is(
    cfg.liquidFilters.url("http://foo.com/unicode_(✪)_in_parens", ""),
    "http://foo.com/unicode_(✪)_in_parens"
  );
  t.is(
    cfg.liquidFilters.url("http://☺.damowmow.com/", ""),
    "http://☺.damowmow.com/"
  );
  t.is(cfg.liquidFilters.url("http://مثال.إختبار", ""), "http://مثال.إختبار");
  t.is(cfg.liquidFilters.url("http://例子.测试", ""), "http://例子.测试");
  t.is(
    cfg.liquidFilters.url("http://उदाहरण.परीक्षा", ""),
    "http://उदाहरण.परीक्षा"
  );
});

test("Test url universal filter", t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.liquidFilters.url("/", "/"), "/");
  t.is(cfg.liquidFilters.url("//", "/"), "/");
  t.is(cfg.liquidFilters.url("", "/"), "/");

  // leave . and .. alone
  t.is(cfg.liquidFilters.url(".", "/"), ".");
  t.is(cfg.liquidFilters.url("./", "/"), "./");
  t.is(cfg.liquidFilters.url("..", "/"), "..");
  t.is(cfg.liquidFilters.url("../", "/"), "../");

  t.is(cfg.liquidFilters.url("test", "/"), "/test");
  t.is(cfg.liquidFilters.url("/test", "/"), "/test");
  t.is(cfg.liquidFilters.url("//test", "/"), "/test");
  t.is(cfg.liquidFilters.url("./test", "/"), "test");
  t.is(cfg.liquidFilters.url("../test", "/"), "../test");

  t.is(cfg.liquidFilters.url("test/", "/"), "/test/");
  t.is(cfg.liquidFilters.url("/test/", "/"), "/test/");
  t.is(cfg.liquidFilters.url("//test/", "/"), "/test/");
  t.is(cfg.liquidFilters.url("./test/", "/"), "test/");
  t.is(cfg.liquidFilters.url("../test/", "/"), "../test/");
});

test("Test url universal filter with custom pathPrefix (empty, gets overwritten by root config `/`)", t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.liquidFilters.url("/", ""), "/");
  t.is(cfg.liquidFilters.url("//", ""), "/");
  t.is(cfg.liquidFilters.url("", ""), "/");

  // leave . and .. alone
  t.is(cfg.liquidFilters.url(".", ""), ".");
  t.is(cfg.liquidFilters.url("./", ""), "./");
  t.is(cfg.liquidFilters.url("..", ""), "..");
  t.is(cfg.liquidFilters.url("../", ""), "../");

  t.is(cfg.liquidFilters.url("test", ""), "/test");
  t.is(cfg.liquidFilters.url("/test", ""), "/test");
  t.is(cfg.liquidFilters.url("//test", ""), "/test");
  t.is(cfg.liquidFilters.url("./test", ""), "test");
  t.is(cfg.liquidFilters.url("../test", ""), "../test");

  t.is(cfg.liquidFilters.url("test/", ""), "/test/");
  t.is(cfg.liquidFilters.url("/test/", ""), "/test/");
  t.is(cfg.liquidFilters.url("//test/", ""), "/test/");
  t.is(cfg.liquidFilters.url("./test/", ""), "test/");
  t.is(cfg.liquidFilters.url("../test/", ""), "../test/");
});

test("Test url universal filter with custom pathPrefix (leading slash)", t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.liquidFilters.url("/", "/testdir"), "/testdir/");
  t.is(cfg.liquidFilters.url("//", "/testdir"), "/testdir/");
  t.is(cfg.liquidFilters.url("", "/testdir"), "/testdir/");

  // leave . and .. alone
  t.is(cfg.liquidFilters.url(".", "/testdir"), ".");
  t.is(cfg.liquidFilters.url("./", "/testdir"), "./");
  t.is(cfg.liquidFilters.url("..", "/testdir"), "..");
  t.is(cfg.liquidFilters.url("../", "/testdir"), "../");

  t.is(cfg.liquidFilters.url("test", "/testdir"), "/testdir/test");
  t.is(cfg.liquidFilters.url("/test", "/testdir"), "/testdir/test");
  t.is(cfg.liquidFilters.url("//test", "/testdir"), "/testdir/test");
  t.is(cfg.liquidFilters.url("./test", "/testdir"), "test");
  t.is(cfg.liquidFilters.url("../test", "/testdir"), "../test");

  t.is(cfg.liquidFilters.url("test/", "/testdir"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("/test/", "/testdir"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("//test/", "/testdir"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("./test/", "/testdir"), "test/");
  t.is(cfg.liquidFilters.url("../test/", "/testdir"), "../test/");
});

test("Test url universal filter with custom pathPrefix (double slash)", t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.liquidFilters.url("/", "/testdir/"), "/testdir/");
  t.is(cfg.liquidFilters.url("//", "/testdir/"), "/testdir/");
  t.is(cfg.liquidFilters.url("", "/testdir/"), "/testdir/");

  // leave . and .. alone
  t.is(cfg.liquidFilters.url(".", "/testdir/"), ".");
  t.is(cfg.liquidFilters.url("./", "/testdir/"), "./");
  t.is(cfg.liquidFilters.url("..", "/testdir/"), "..");
  t.is(cfg.liquidFilters.url("../", "/testdir/"), "../");

  t.is(cfg.liquidFilters.url("test", "/testdir/"), "/testdir/test");
  t.is(cfg.liquidFilters.url("/test", "/testdir/"), "/testdir/test");
  t.is(cfg.liquidFilters.url("//test", "/testdir/"), "/testdir/test");
  t.is(cfg.liquidFilters.url("./test", "/testdir/"), "test");
  t.is(cfg.liquidFilters.url("../test", "/testdir/"), "../test");

  t.is(cfg.liquidFilters.url("test/", "/testdir/"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("/test/", "/testdir/"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("//test/", "/testdir/"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("./test/", "/testdir/"), "test/");
  t.is(cfg.liquidFilters.url("../test/", "/testdir/"), "../test/");
});

test("Test url universal filter with custom pathPrefix (trailing slash)", t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.liquidFilters.url("/", "testdir/"), "/testdir/");
  t.is(cfg.liquidFilters.url("//", "testdir/"), "/testdir/");
  t.is(cfg.liquidFilters.url("", "testdir/"), "/testdir/");

  // leave . and .. alone
  t.is(cfg.liquidFilters.url(".", "testdir/"), ".");
  t.is(cfg.liquidFilters.url("./", "testdir/"), "./");
  t.is(cfg.liquidFilters.url("..", "testdir/"), "..");
  t.is(cfg.liquidFilters.url("../", "testdir/"), "../");

  t.is(cfg.liquidFilters.url("test", "testdir/"), "/testdir/test");
  t.is(cfg.liquidFilters.url("/test", "testdir/"), "/testdir/test");
  t.is(cfg.liquidFilters.url("//test", "testdir/"), "/testdir/test");
  t.is(cfg.liquidFilters.url("./test", "testdir/"), "test");
  t.is(cfg.liquidFilters.url("../test", "testdir/"), "../test");

  t.is(cfg.liquidFilters.url("test/", "testdir/"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("/test/", "testdir/"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("//test/", "testdir/"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("./test/", "testdir/"), "test/");
  t.is(cfg.liquidFilters.url("../test/", "testdir/"), "../test/");
});

test("Test url universal filter with custom pathPrefix (no slash)", t => {
  let templateCfg = new TemplateConfig(
    require("../config.js"),
    "./test/stubs/config.js"
  );
  let cfg = templateCfg.getConfig();

  t.is(cfg.liquidFilters.url("/", "testdir"), "/testdir/");
  t.is(cfg.liquidFilters.url("//", "testdir"), "/testdir/");
  t.is(cfg.liquidFilters.url("", "testdir"), "/testdir/");

  // leave . and .. alone
  t.is(cfg.liquidFilters.url(".", "testdir"), ".");
  t.is(cfg.liquidFilters.url("./", "testdir"), "./");
  t.is(cfg.liquidFilters.url("..", "testdir"), "..");
  t.is(cfg.liquidFilters.url("../", "testdir"), "../");

  t.is(cfg.liquidFilters.url("test", "testdir"), "/testdir/test");
  t.is(cfg.liquidFilters.url("/test", "testdir"), "/testdir/test");
  t.is(cfg.liquidFilters.url("//test", "testdir"), "/testdir/test");
  t.is(cfg.liquidFilters.url("./test", "testdir"), "test");
  t.is(cfg.liquidFilters.url("../test", "testdir"), "../test");

  t.is(cfg.liquidFilters.url("test/", "testdir"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("/test/", "testdir"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("//test/", "testdir"), "/testdir/test/");
  t.is(cfg.liquidFilters.url("./test/", "testdir"), "test/");
  t.is(cfg.liquidFilters.url("../test/", "testdir"), "../test/");
});
