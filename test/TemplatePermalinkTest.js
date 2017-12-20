import test from "ava";
import parsePath from "parse-filepath";
import TemplatePermalink from "../src/TemplatePermalink";

test("Simple", t => {
  t.is(
    new TemplatePermalink("permalinksubfolder/").toString(),
    "permalinksubfolder/index.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/").toString(),
    "permalinksubfolder/index.html"
  );

  t.is(
    new TemplatePermalink("permalinksubfolder/test.html").toString(),
    "permalinksubfolder/test.html"
  );
  t.is(
    new TemplatePermalink("./permalinksubfolder/test.html").toString(),
    "permalinksubfolder/test.html"
  );

  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "0/").toString(),
    "permalinksubfolder/0/test.html"
  );
  t.is(
    new TemplatePermalink("permalinksubfolder/test.html", "1/").toString(),
    "permalinksubfolder/1/test.html"
  );
});
