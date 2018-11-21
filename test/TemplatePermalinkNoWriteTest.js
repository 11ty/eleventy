import test from "ava";
import TemplatePermalinkNoWrite from "../src/TemplatePermalinkNoWrite";

test("Test standard method signature", t => {
  let perm = new TemplatePermalinkNoWrite();
  t.is(perm.toHref(), false);
  t.is(perm.toString(), false);
});
