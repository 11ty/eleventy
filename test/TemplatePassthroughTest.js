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
