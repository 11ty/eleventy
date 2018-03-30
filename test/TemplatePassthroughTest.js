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
  let pass = new TemplatePassthrough("_src/img", "_site");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/img");
});

test("Origin path isn’t included in output when targeting a directory several levels deep", t => {
  let pass = new TemplatePassthrough("_src/subdir/img", "_site");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/img");
});

test("Origin path isn’t included in output when targeting a file", t => {
  let pass = new TemplatePassthrough("_src/avatar.png", "_site");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Origin path isn’t included in output when targeting a file several levels deep", t => {
  let pass = new TemplatePassthrough("_src/subdir/img/avatar.png", "_site");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});
