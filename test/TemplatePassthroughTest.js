import test from "ava";
import TemplatePassthrough from "../src/TemplatePassthrough";

test("Constructor", t => {
  let pass = new TemplatePassthrough("avatar.png", "_site", ".");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Constructor Dry Run", t => {
  let pass = new TemplatePassthrough("avatar.png", "_site", ".");
  pass.setDryRun(true);
  t.is(pass.isDryRun, true);
});

test("Origin path isn’t included in output when targeting a directory", t => {
  let pass = new TemplatePassthrough("img", "_site", "_src");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/img");
});

test("Origin path isn’t included in output when targeting a directory several levels deep", t => {
  let pass = new TemplatePassthrough("img", "_site", "_src/subdir");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/img");
});

test("Target directory’s subdirectory structure is retained", t => {
  let pass = new TemplatePassthrough("subdir/img", "_site", "_src");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/subdir/img");
});

test("Origin path isn’t included in output when targeting a file", t => {
  let pass = new TemplatePassthrough("avatar.png", "_site", "_src");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Origin path isn’t included in output when targeting a file several levels deep", t => {
  let pass = new TemplatePassthrough("avatar.png", "_site", "_src/subdir/img");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Full input file path and deep input path", t => {
  t.is(
    new TemplatePassthrough(
      "src/views/avatar.png",
      "_site",
      "src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "src/views/avatar.png",
      "_site",
      "src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "src/views/avatar.png",
      "_site/",
      "src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "src/views/avatar.png",
      "./_site",
      "./src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "./src/views/avatar.png",
      "./_site/",
      "./src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "./src/views/avatar.png",
      "_site",
      "src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
});

test(".htaccess", t => {
  let pass = new TemplatePassthrough(".htaccess", "_site", ".");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/.htaccess");
});

test(".htaccess with input dir", t => {
  let pass = new TemplatePassthrough(".htaccess", "_site", "_src");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/.htaccess");
});
