const test = require("ava");
const TemplatePermalinkNoWrite = require("../src/TemplatePermalinkNoWrite");

test("Test standard method signature", (t) => {
  let perm = new TemplatePermalinkNoWrite();
  t.is(perm.toHref(), false);
  t.is(perm.toString(), false);
});
