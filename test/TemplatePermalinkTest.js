import test from "ava";
import parsePath from "parse-filepath";
import TemplatePermalink from "../src/TemplatePermalink";

test("Simple straight permalink", t => {
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html").toString(),
    "permalinksubfolder/test.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/test.html").toString(),
    "permalinksubfolder/test.html"
  );
});

test("Permalink without filename", t => {
  t.is(
    new TemplatePermalink("permalinksubfolder/").toString(),
    "permalinksubfolder/index.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/").toString(),
    "permalinksubfolder/index.html"
  );
});

test("Permalink with pagination subdir", t => {
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "0/").toString(),
    "permalinksubfolder/0/test.html"
  );
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "1/").toString(),
    "permalinksubfolder/1/test.html"
  );
});

test("Permalink generate", t => {
  let gen = TemplatePermalink.generate;

  t.is(gen("./", "index").toString(), "index.html");
  t.is(gen(".", "index").toString(), "index.html");
  t.is(gen(".", "test").toString(), "test/index.html");
  t.is(gen(".", "test", "0/").toString(), "test/0/index.html");
  t.is(gen(".", "test", "1/").toString(), "test/1/index.html");
});

test("Permalink generate with suffix", t => {
  let gen = TemplatePermalink.generate;

  t.is(gen(".", "test", null, "-output").toString(), "test/index-output.html");
  t.is(
    gen(".", "test", "1/", "-output").toString(),
    "test/1/index-output.html"
  );
});

test("Permalink generate with subfolders", t => {
  let gen = TemplatePermalink.generate;

  t.is(
    gen("permalinksubfolder/", "index").toString(),
    "permalinksubfolder/index.html"
  );
  t.is(
    gen("permalinksubfolder/", "test").toString(),
    "permalinksubfolder/test/index.html"
  );
  t.is(
    gen("permalinksubfolder/", "test", "1/", "-output").toString(),
    "permalinksubfolder/test/1/index-output.html"
  );
});

test("Permalink matching folder and filename", t => {
  let gen = TemplatePermalink.generate;
  let hasDupe = TemplatePermalink._hasDuplicateFolder;
  t.is(hasDupe("subfolder", "component"), false);
  t.is(hasDupe("subfolder/", "component"), false);
  t.is(hasDupe(".", "component"), false);

  t.is(hasDupe("component", "component"), true);
  t.is(hasDupe("component/", "component"), true);

  t.is(gen("component/", "component").toString(), "component/index.html");
});
