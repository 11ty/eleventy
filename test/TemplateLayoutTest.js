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
