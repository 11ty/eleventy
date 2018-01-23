import test from "ava";
import path from "path";
import TemplatePath from "../src/TemplatePath";

test("Working dir", t => {
  t.is(TemplatePath.getWorkingDir(), path.resolve("./"));
  t.is(TemplatePath.getModuleDir(), path.resolve(__dirname, ".."));
});

test("Normalizer", async t => {
  t.is(TemplatePath.normalize(""), ".");
  t.is(TemplatePath.normalize("."), ".");
  t.is(TemplatePath.normalize("/"), "/");
  t.is(TemplatePath.normalize("/testing"), "/testing");
  t.is(TemplatePath.normalize("/testing/"), "/testing");

  t.is(TemplatePath.normalize("./"), "./");
  t.is(TemplatePath.normalize("./testing"), "testing");

  t.is(TemplatePath.normalize("../"), "..");
  t.is(TemplatePath.normalize("../testing"), "../testing");

  t.is(TemplatePath.normalize("testing", "hello"), "testing/hello");
  t.is(TemplatePath.normalize("testing", "hello/"), "testing/hello");
  t.is(TemplatePath.normalize("./testing", "hello"), "testing/hello");
  t.is(TemplatePath.normalize("./testing", "hello/"), "testing/hello");
  t.is(TemplatePath.normalize("./testing/hello"), "testing/hello");
  t.is(TemplatePath.normalize("./testing/hello/"), "testing/hello");
});

test("stripLeadingDotSlash", t => {
  t.is(TemplatePath.stripLeadingDotSlash("./test/stubs"), "test/stubs");
  t.is(TemplatePath.stripLeadingDotSlash("./dist"), "dist");
  t.is(TemplatePath.stripLeadingDotSlash("../dist"), "../dist");
  t.is(TemplatePath.stripLeadingDotSlash("dist"), "dist");
});

test("addLeadingDotSlash", t => {
  t.is(TemplatePath.addLeadingDotSlash("./test/stubs"), "./test/stubs");
  t.is(TemplatePath.addLeadingDotSlash("./dist"), "./dist");
  t.is(TemplatePath.addLeadingDotSlash("../dist"), "../dist");
  t.is(TemplatePath.addLeadingDotSlash("/dist"), "/dist");
  t.is(TemplatePath.addLeadingDotSlash("dist"), "./dist");
  t.is(TemplatePath.addLeadingDotSlash(".nyc_output"), "./.nyc_output");
});

test("stripPathFromDir", t => {
  t.is(
    TemplatePath.stripPathFromDir("./testing/hello", "./lskdjklfjz"),
    "testing/hello"
  );
  t.is(TemplatePath.stripPathFromDir("./test/stubs", "./test"), "stubs");
  t.is(TemplatePath.stripPathFromDir("./testing/hello", "testing"), "hello");
  t.is(TemplatePath.stripPathFromDir("testing/hello", "testing"), "hello");
  t.is(TemplatePath.stripPathFromDir("testing/hello", "./testing"), "hello");
  t.is(
    TemplatePath.stripPathFromDir("testing/hello/subdir/test", "testing"),
    "hello/subdir/test"
  );
});
