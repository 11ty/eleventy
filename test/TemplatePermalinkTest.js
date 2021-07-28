const test = require("ava");
const TemplatePermalink = require("../src/TemplatePermalink");

test("Simple straight permalink", (t) => {
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html").toLink(),
    "permalinksubfolder/test.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/test.html").toLink(),
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
    new TemplatePermalink("permalinksubfolder/").toLink(),
    "permalinksubfolder/index.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/").toLink(),
    "permalinksubfolder/index.html"
  );
  t.is(
    new TemplatePermalink("/permalinksubfolder/").toLink(),
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
    new TemplatePermalink("permalinksubfolder/test.html", "0/").toLink(),
    "permalinksubfolder/0/test.html"
  );
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "1/").toLink(),
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

  t.is(gen("./", "index").toLink(), "index.html");
  t.is(gen("./", "index").toHref(), "/");
  t.is(gen(".", "index").toLink(), "index.html");
  t.is(gen(".", "index").toHref(), "/");
  t.is(gen(".", "test").toLink(), "test/index.html");
  t.is(gen(".", "test").toHref(), "/test/");
  t.is(gen(".", "test", "0/").toLink(), "test/0/index.html");
  t.is(gen(".", "test", "0/").toHref(), "/test/0/");
  t.is(gen(".", "test", "1/").toLink(), "test/1/index.html");
  t.is(gen(".", "test", "1/").toHref(), "/test/1/");
});

test("Permalink generate with suffix", (t) => {
  let gen = TemplatePermalink.generate;

  t.is(gen(".", "test", null, "-o").toLink(), "test/index-o.html");
  t.is(gen(".", "test", null, "-o").toHref(), "/test/index-o.html");
  t.is(gen(".", "test", "1/", "-o").toLink(), "test/1/index-o.html");
  t.is(gen(".", "test", "1/", "-o").toHref(), "/test/1/index-o.html");
});

test("Permalink generate with new extension", (t) => {
  let gen = TemplatePermalink.generate;

  t.is(gen(".", "test", null, null, "css").toLink(), "test.css");
  t.is(gen(".", "test", null, null, "css").toHref(), "/test.css");
  t.is(gen(".", "test", "1/", null, "css").toLink(), "1/test.css");
  t.is(gen(".", "test", "1/", null, "css").toHref(), "/1/test.css");
});

test("Permalink generate with subfolders", (t) => {
  let gen = TemplatePermalink.generate;

  t.is(
    gen("permalinksubfolder/", "index").toLink(),
    "permalinksubfolder/index.html"
  );
  t.is(
    gen("permalinksubfolder/", "test").toLink(),
    "permalinksubfolder/test/index.html"
  );
  t.is(
    gen("permalinksubfolder/", "test", "1/", "-o").toLink(),
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

  t.is(gen("component/", "component").toLink(), "component/index.html");
  t.is(gen("component/", "component").toHref(), "/component/");
});

test("Permalink Object, just build", (t) => {
  t.is(
    new TemplatePermalink({
      build: "permalinksubfolder/test.html",
    }).toLink(),
    "permalinksubfolder/test.html"
  );

  t.is(
    new TemplatePermalink({
      build: false,
    }).toLink(),
    false
  );

  t.throws(() => {
    new TemplatePermalink({
      build: true,
    }).toLink();
  });
});

test("Permalink Object, serverless URLs", (t) => {
  // serverless
  t.is(
    new TemplatePermalink({
      serverless: "permalinksubfolder/test.html",
    }).toLink(),
    "permalinksubfolder/test.html"
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
    }).toLink(),
    "/url/"
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
    }).toLink(),
    "/url/"
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
    }).toLink(),
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
    }).toLink(),
    "/serverless/"
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
  t.is(new TemplatePermalink({}).toLink(), false);

  t.is(new TemplatePermalink({}).toHref(), false);
});
