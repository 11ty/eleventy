const test = require("ava");
const TemplatePermalink = require("../src/TemplatePermalink");

test("Simple straight permalink", (t) => {
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html").toOutputPath(),
    "permalinksubfolder/test.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/test.html").toOutputPath(),
    "permalinksubfolder/test.html"
  );

  t.is(
    new TemplatePermalink("permalinksubfolder/test.html").toHref(),
    "/permalinksubfolder/test.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/test.html").toHref(),
    "/permalinksubfolder/test.html"
  );
  t.is(new TemplatePermalink("./testindex.html").toHref(), "/testindex.html");
  t.is(
    new TemplatePermalink("./permalinksubfolder/testindex.html").toHref(),
    "/permalinksubfolder/testindex.html"
  );
});

test("Permalink without filename", (t) => {
  t.is(
    new TemplatePermalink("permalinksubfolder/").toOutputPath(),
    "permalinksubfolder/index.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/").toOutputPath(),
    "permalinksubfolder/index.html"
  );
  t.is(
    new TemplatePermalink("/permalinksubfolder/").toOutputPath(),
    "/permalinksubfolder/index.html"
  );

  t.is(
    new TemplatePermalink("permalinksubfolder/").toHref(),
    "/permalinksubfolder/"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/").toHref(),
    "/permalinksubfolder/"
  );
  t.is(
    new TemplatePermalink("/permalinksubfolder/").toHref(),
    "/permalinksubfolder/"
  );
});

test("Permalink with pagination subdir", (t) => {
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "0/").toOutputPath(),
    "permalinksubfolder/0/test.html"
  );
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "1/").toOutputPath(),
    "permalinksubfolder/1/test.html"
  );

  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "0/").toHref(),
    "/permalinksubfolder/0/test.html"
  );
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "1/").toHref(),
    "/permalinksubfolder/1/test.html"
  );
});

test("Permalink generate", (t) => {
  let gen = TemplatePermalink.generate;

  t.is(gen("./", "index").toOutputPath(), "index.html");
  t.is(gen("./", "index").toHref(), "/");
  t.is(gen(".", "index").toOutputPath(), "index.html");
  t.is(gen(".", "index").toHref(), "/");
  t.is(gen(".", "test").toOutputPath(), "test/index.html");
  t.is(gen(".", "test").toHref(), "/test/");
  t.is(gen(".", "test", "0/").toOutputPath(), "test/0/index.html");
  t.is(gen(".", "test", "0/").toHref(), "/test/0/");
  t.is(gen(".", "test", "1/").toOutputPath(), "test/1/index.html");
  t.is(gen(".", "test", "1/").toHref(), "/test/1/");
});

test("Permalink generate with suffix", (t) => {
  let gen = TemplatePermalink.generate;

  t.is(gen(".", "test", null, "-o").toOutputPath(), "test/index-o.html");
  t.is(gen(".", "test", null, "-o").toHref(), "/test/index-o.html");
  t.is(gen(".", "test", "1/", "-o").toOutputPath(), "test/1/index-o.html");
  t.is(gen(".", "test", "1/", "-o").toHref(), "/test/1/index-o.html");
});

test("Permalink generate with new extension", (t) => {
  let gen = TemplatePermalink.generate;

  t.is(gen(".", "test", null, null, "css").toOutputPath(), "test.css");
  t.is(gen(".", "test", null, null, "css").toHref(), "/test.css");
  t.is(gen(".", "test", "1/", null, "css").toOutputPath(), "1/test.css");
  t.is(gen(".", "test", "1/", null, "css").toHref(), "/1/test.css");
});

test("Permalink generate with subfolders", (t) => {
  let gen = TemplatePermalink.generate;

  t.is(
    gen("permalinksubfolder/", "index").toOutputPath(),
    "permalinksubfolder/index.html"
  );
  t.is(
    gen("permalinksubfolder/", "test").toOutputPath(),
    "permalinksubfolder/test/index.html"
  );
  t.is(
    gen("permalinksubfolder/", "test", "1/", "-o").toOutputPath(),
    "permalinksubfolder/test/1/index-o.html"
  );

  t.is(gen("permalinksubfolder/", "index").toHref(), "/permalinksubfolder/");
  t.is(
    gen("permalinksubfolder/", "test").toHref(),
    "/permalinksubfolder/test/"
  );
  t.is(
    gen("permalinksubfolder/", "test", "1/", "-o").toHref(),
    "/permalinksubfolder/test/1/index-o.html"
  );
});

test("Permalink matching folder and filename", (t) => {
  let gen = TemplatePermalink.generate;
  let hasDupe = TemplatePermalink._hasDuplicateFolder;
  t.is(hasDupe("subfolder", "component"), false);
  t.is(hasDupe("subfolder/", "component"), false);
  t.is(hasDupe(".", "component"), false);

  t.is(hasDupe("component", "component"), true);
  t.is(hasDupe("component/", "component"), true);

  t.is(gen("component/", "component").toOutputPath(), "component/index.html");
  t.is(gen("component/", "component").toHref(), "/component/");
});

test("Permalink Object, just build", (t) => {
  t.is(
    new TemplatePermalink({
      build: "permalinksubfolder/test.html",
    }).toOutputPath(),
    "permalinksubfolder/test.html"
  );

  t.is(
    new TemplatePermalink({
      build: false,
    }).toOutputPath(),
    false
  );

  t.throws(() => {
    new TemplatePermalink({
      build: true,
    }).toOutputPath();
  });
});

test("Permalink Object, serverless URLs", (t) => {
  // serverless
  t.is(
    new TemplatePermalink({
      serverless: "permalinksubfolder/test.html",
    }).toOutputPath(),
    false
  );

  t.is(
    new TemplatePermalink({
      serverless: "permalinksubfolder/test.html",
    }).toHref(),
    "permalinksubfolder/test.html"
  );

  // request
  t.is(
    new TemplatePermalink({
      request: "/url/",
    }).toOutputPath(),
    false
  );

  t.is(
    new TemplatePermalink({
      request: "/url/",
    }).toHref(),
    "/url/"
  );

  // rando
  t.is(
    new TemplatePermalink({
      rando: "/url/",
    }).toOutputPath(),
    false
  );

  t.is(
    new TemplatePermalink({
      rando: "/url/",
    }).toHref(),
    "/url/"
  );
});

test("Permalink Object, combo build and serverless URLs", (t) => {
  t.is(
    new TemplatePermalink({
      build: "/url/",
      serverless: "/serverless/",
    }).toOutputPath(),
    "/url/index.html"
  );

  t.is(
    new TemplatePermalink({
      build: "/url/",
      serverless: "/serverless/",
    }).toHref(),
    "/url/"
  );

  // reordered, serverless is primary
  t.is(
    new TemplatePermalink({
      serverless: "/serverless/",
      build: "/url/",
    }).toOutputPath(),
    "/url/index.html"
  );

  t.is(
    new TemplatePermalink({
      serverless: "/serverless/",
      build: "/url/",
    }).toHref(),
    "/serverless/"
  );
});

test("Permalink Object, empty object", (t) => {
  t.is(new TemplatePermalink({}).toOutputPath(), false);

  t.is(new TemplatePermalink({}).toHref(), false);
});

test("Permalink Object, serverless with path params", (t) => {
  let perm = new TemplatePermalink({
    serverless: "/serverless/:test/",
  });
  perm.setServerlessPathData({
    test: "yeearg",
  });
  t.is(perm.toHref(), "/serverless/yeearg/");
});
