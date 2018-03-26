import test from "ava";
import TemplateLayout from "../src/TemplateLayout";

test("Layout", t => {
  t.is(
    new TemplateLayout("default", "./test/stubs").getFileName(),
    "default.ejs"
  );
});

test("Layout already has extension", t => {
  t.is(
    new TemplateLayout("default.ejs", "./test/stubs").getFileName(),
    "default.ejs"
  );
});

test("Layout subdir", t => {
  t.is(
    new TemplateLayout(
      "layouts/inasubdir",
      "./test/stubs/_includes"
    ).getFileName(),
    "layouts/inasubdir.njk"
  );
});

test("Layout subdir already has extension", t => {
  t.is(
    new TemplateLayout(
      "layouts/inasubdir.njk",
      "./test/stubs/_includes"
    ).getFileName(),
    "layouts/inasubdir.njk"
  );
});

test("Multiple layouts exist with the same file base, pick one", t => {
  // pick the first one if multiple exist.
  t.is(
    new TemplateLayout("multiple", "./test/stubs").getFileName(),
    "multiple.ejs"
  );
});

test("Multiple layouts exist but we are being explicit—layout already has extension", t => {
  t.is(
    new TemplateLayout("multiple.ejs", "./test/stubs").getFileName(),
    "multiple.ejs"
  );
  t.is(
    new TemplateLayout("multiple.md", "./test/stubs").getFileName(),
    "multiple.md"
  );
});

test("Layout is aliased to a new location", t => {
  let tl = new TemplateLayout("post", "./test/stubs/_includes");
  tl.addLayoutAlias("post", "layouts/post.ejs");
  tl.init();

  t.is(tl.getFileName(), "layouts/post.ejs");
});

test("Global default with empty string alias", t => {
  let tl = new TemplateLayout("", "./test/stubs/_includes");
  tl.addLayoutAlias("", "layouts/post.ejs");
  tl.init();

  t.is(tl.getFileName(), "layouts/post.ejs");
});

test("Global default with empty string alias (but no alias exists for this instance)", t => {
  let tl = new TemplateLayout("layout.ejs", "./test/stubs/_includes");
  tl.addLayoutAlias("", "layouts/post.ejs");
  tl.init();

  t.throws(() => {
    tl.getFileName();
  });
});

test("Layout has no alias and does not exist", async t => {
  let tl = new TemplateLayout("default", "./test/stubs/_includes");
  tl.addLayoutAlias("post", "layouts/post.ejs");
  tl.init();

  t.throws(() => {
    tl.getFileName();
  });

  t.throws(() => {
    tl.getFullPath();
  });
});
