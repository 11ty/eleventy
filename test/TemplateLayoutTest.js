import test from "ava";
import Layout from "../src/TemplateLayout";

test(t => {
  t.is(new Layout("default", "./test/stubs").getFileName(), "default.ejs");
});

test("Layout already has extension", t => {
  t.is(new Layout("default.ejs", "./test/stubs").getFileName(), "default.ejs");
});

test("Multiple layouts exist with the same file base, pick one", t => {
  // pick the first one if multiple exist.
  t.is(new Layout("multiple", "./test/stubs").getFileName(), "multiple.ejs");
});

test("Multiple layouts exist but we are being explicit—layout already has extension", t => {
  t.is(
    new Layout("multiple.ejs", "./test/stubs").getFileName(),
    "multiple.ejs"
  );
  t.is(new Layout("multiple.md", "./test/stubs").getFileName(), "multiple.md");
});
