import test from "ava";
import path from "path";
import normalize from "normalize-path";
import TemplatePath from "../src/TemplatePath";

test("getWorkingDir", t => {
  t.is(TemplatePath.getWorkingDir(), path.resolve("./"));
  t.is(TemplatePath._getModuleDir(), path.resolve(__dirname, ".."));
});

test("getDir", t => {
  t.is(TemplatePath.getDir("README.md"), ".");
  t.is(TemplatePath.getDir("test/stubs/config.js"), "test/stubs");
  t.is(TemplatePath.getDir("./test/stubs/config.js"), "./test/stubs");
  t.is(TemplatePath.getDir("test/stubs/*.md"), "test/stubs");
  t.is(TemplatePath.getDir("test/stubs/**"), "test/stubs");
  t.is(TemplatePath.getDir("test/stubs/!(multiple.md)"), "test/stubs");
});

test("getDirFromFilePath", t => {
  t.is(TemplatePath.getDirFromFilePath("test/stubs/*.md"), "test/stubs");
  t.is(TemplatePath.getDirFromFilePath("test/stubs/!(x.md)"), "test/stubs");
});

test("getLastPathSegment", t => {
  t.is(TemplatePath.getLastPathSegment("./testing/hello"), "hello");
  t.is(TemplatePath.getLastPathSegment("./testing"), "testing");
  t.is(TemplatePath.getLastPathSegment("./testing/"), "testing");
  t.is(TemplatePath.getLastPathSegment("testing/"), "testing");
  t.is(TemplatePath.getLastPathSegment("testing"), "testing");
});

test("getAllDirs", t => {
  t.deepEqual(TemplatePath.getAllDirs("."), ["."]);
  t.deepEqual(TemplatePath.getAllDirs("./"), ["."]);
  t.deepEqual(TemplatePath.getAllDirs("./testing"), ["./testing"]);
  t.deepEqual(TemplatePath.getAllDirs("./testing/"), ["./testing"]);
  t.deepEqual(TemplatePath.getAllDirs("testing/"), ["testing"]);
  t.deepEqual(TemplatePath.getAllDirs("testing"), ["testing"]);
  t.deepEqual(TemplatePath.getAllDirs("./testing/hello"), [
    "./testing",
    "./testing/hello"
  ]);
  t.deepEqual(TemplatePath.getAllDirs("./src/collections/posts"), [
    "./src",
    "./src/collections",
    "./src/collections/posts"
  ]);
});

test("normalize", async t => {
  t.is(TemplatePath.normalize(""), ".");
  t.is(TemplatePath.normalize("."), ".");
  t.is(TemplatePath.normalize("/"), "/");
  t.is(TemplatePath.normalize("/testing"), "/testing");
  t.is(TemplatePath.normalize("/testing/"), "/testing");

  // v0.4.0 changed from `./` to `.`
  // normalize removes trailing slashes so it should probably be `.`
  t.is(TemplatePath.normalize("./"), ".");
  t.is(TemplatePath.normalize("./testing"), "testing");

  t.is(TemplatePath.normalize("../"), "..");
  t.is(TemplatePath.normalize("../testing"), "../testing");

  t.is(TemplatePath.normalize("./testing/hello"), "testing/hello");
  t.is(TemplatePath.normalize("./testing/hello/"), "testing/hello");

  t.is(normalize(".htaccess"), ".htaccess");
  t.is(TemplatePath.normalize(".htaccess"), ".htaccess");
});

test("join", async t => {
  t.is(TemplatePath.join("src", "_includes"), "src/_includes");
  t.is(TemplatePath.join("src", "_includes/"), "src/_includes");
  t.is(TemplatePath.join("src", "/_includes"), "src/_includes");
  t.is(TemplatePath.join("src", "./_includes"), "src/_includes");
  t.is(TemplatePath.join("src", "//_includes"), "src/_includes");

  t.is(TemplatePath.join("./src", "_includes"), "src/_includes");
  t.is(TemplatePath.join("./src", "_includes/"), "src/_includes");
  t.is(TemplatePath.join("./src", "/_includes"), "src/_includes");
  t.is(TemplatePath.join("./src", "./_includes"), "src/_includes");
  t.is(TemplatePath.join("./src", "//_includes"), "src/_includes");

  t.is(TemplatePath.join("src", "test", "..", "_includes"), "src/_includes");
});

test("hasTrailingSlash", t => {
  t.is(TemplatePath.hasTrailingSlash(undefined), false);
  t.is(TemplatePath.hasTrailingSlash(""), false);
  t.is(TemplatePath.hasTrailingSlash("dist"), false);
  t.is(TemplatePath.hasTrailingSlash("./test/stubs"), false);
  t.is(TemplatePath.hasTrailingSlash("/"), true);
  t.is(TemplatePath.hasTrailingSlash("dist/"), true);
  t.is(TemplatePath.hasTrailingSlash("./test/stubs/"), true);
});

test("absolutePath", t => {
  t.is(
    TemplatePath.absolutePath(".eleventy.js")
      .split("/")
      .pop(),
    ".eleventy.js"
  );
});

test("absolutePath and relativePath", t => {
  t.is(
    TemplatePath.relativePath(TemplatePath.absolutePath(".eleventy.js")),
    ".eleventy.js"
  );
});

test("addLeadingDotSlash", t => {
  t.is(TemplatePath.addLeadingDotSlash("."), "./");
  t.is(TemplatePath.addLeadingDotSlash(".."), "../");
  t.is(TemplatePath.addLeadingDotSlash("./test/stubs"), "./test/stubs");
  t.is(TemplatePath.addLeadingDotSlash("./dist"), "./dist");
  t.is(TemplatePath.addLeadingDotSlash("../dist"), "../dist");
  t.is(TemplatePath.addLeadingDotSlash("/dist"), "/dist");
  t.is(TemplatePath.addLeadingDotSlash("dist"), "./dist");
  t.is(TemplatePath.addLeadingDotSlash(".nyc_output"), "./.nyc_output");
});

test("addLeadingDotSlashArray", t => {
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["."]), ["./"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray([".."]), ["../"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["./test/stubs"]), [
    "./test/stubs"
  ]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["./dist"]), ["./dist"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["../dist"]), ["../dist"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["/dist"]), ["/dist"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["dist"]), ["./dist"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray([".nyc_output"]), [
    "./.nyc_output"
  ]);
});

test("stripLeadingDotSlash", t => {
  t.is(TemplatePath.stripLeadingDotSlash("./test/stubs"), "test/stubs");
  t.is(TemplatePath.stripLeadingDotSlash("./dist"), "dist");
  t.is(TemplatePath.stripLeadingDotSlash("../dist"), "../dist");
  t.is(TemplatePath.stripLeadingDotSlash("dist"), "dist");

  t.is(TemplatePath.stripLeadingDotSlash(".htaccess"), ".htaccess");
});

test("startsWithSubPath", t => {
  t.false(TemplatePath.startsWithSubPath("./testing/hello", "./lskdjklfjz"));
  t.false(TemplatePath.startsWithSubPath("./testing/hello", "lskdjklfjz"));
  t.false(TemplatePath.startsWithSubPath("testing/hello", "./lskdjklfjz"));
  t.false(TemplatePath.startsWithSubPath("testing/hello", "lskdjklfjz"));

  t.true(TemplatePath.startsWithSubPath("./testing/hello", "./testing"));
  t.true(TemplatePath.startsWithSubPath("./testing/hello", "testing"));
  t.true(TemplatePath.startsWithSubPath("testing/hello", "./testing"));
  t.true(TemplatePath.startsWithSubPath("testing/hello", "testing"));

  t.true(
    TemplatePath.startsWithSubPath("testing/hello/subdir/test", "testing")
  );
  t.false(TemplatePath.startsWithSubPath("testing/hello/subdir/test", "hello"));
  t.false(
    TemplatePath.startsWithSubPath("testing/hello/subdir/test", "hello/subdir")
  );
  t.true(
    TemplatePath.startsWithSubPath(
      "testing/hello/subdir/test",
      "testing/hello/subdir"
    )
  );
  t.true(
    TemplatePath.startsWithSubPath(
      "testing/hello/subdir/test",
      "testing/hello/subdir/test"
    )
  );
});

test("stripLeadingSubPath", t => {
  t.is(
    TemplatePath.stripLeadingSubPath("./testing/hello", "./lskdjklfjz"),
    "testing/hello"
  );
  t.is(TemplatePath.stripLeadingSubPath("./test/stubs", "stubs"), "test/stubs");
  t.is(TemplatePath.stripLeadingSubPath("./test/stubs", "./test"), "stubs");
  t.is(TemplatePath.stripLeadingSubPath("./testing/hello", "testing"), "hello");
  t.is(TemplatePath.stripLeadingSubPath("testing/hello", "testing"), "hello");
  t.is(TemplatePath.stripLeadingSubPath("testing/hello", "./testing"), "hello");
  t.is(
    TemplatePath.stripLeadingSubPath("testing/hello/subdir/test", "testing"),
    "hello/subdir/test"
  );

  t.is(TemplatePath.stripLeadingSubPath(".htaccess", "./"), ".htaccess");
  t.is(TemplatePath.stripLeadingSubPath(".htaccess", "."), ".htaccess");
});

test("convertToRecursiveGlob", t => {
  t.is(TemplatePath.convertToRecursiveGlob(""), "./**");
  t.is(TemplatePath.convertToRecursiveGlob("."), "./**");
  t.is(TemplatePath.convertToRecursiveGlob("./"), "./**");
  t.is(TemplatePath.convertToRecursiveGlob("test/stubs"), "./test/stubs/**");
  t.is(TemplatePath.convertToRecursiveGlob("test/stubs/"), "./test/stubs/**");
  t.is(TemplatePath.convertToRecursiveGlob("./test/stubs/"), "./test/stubs/**");
  t.is(
    TemplatePath.convertToRecursiveGlob("./test/stubs/config.js"),
    "./test/stubs/config.js"
  );
});

test("Get extension", t => {
  t.is(TemplatePath.getExtension(""), "");
  t.is(TemplatePath.getExtension("test/stubs"), "");
  t.is(TemplatePath.getExtension("test/stubs.njk"), "njk");
  t.is(TemplatePath.getExtension("test/stubs.hbs"), "hbs");
});

test("Remove extension", t => {
  t.is(TemplatePath.removeExtension(""), "");
  t.is(TemplatePath.removeExtension("", "hbs"), "");

  t.is(TemplatePath.removeExtension("test/stubs", "hbs"), "test/stubs");
  t.is(TemplatePath.removeExtension("test/stubs.njk"), "test/stubs.njk");
  t.is(TemplatePath.removeExtension("test/stubs.njk", "hbs"), "test/stubs.njk");
  t.is(TemplatePath.removeExtension("test/stubs.hbs", "hbs"), "test/stubs");

  t.is(TemplatePath.removeExtension("./test/stubs.njk"), "./test/stubs.njk");
  t.is(
    TemplatePath.removeExtension("./test/stubs.njk", "hbs"),
    "./test/stubs.njk"
  );
  t.is(TemplatePath.removeExtension("./test/stubs.hbs", "hbs"), "./test/stubs");

  t.is(TemplatePath.removeExtension("test/stubs", ".hbs"), "test/stubs");
  t.is(
    TemplatePath.removeExtension("test/stubs.njk", ".hbs"),
    "test/stubs.njk"
  );
  t.is(TemplatePath.removeExtension("test/stubs.hbs", ".hbs"), "test/stubs");
  t.is(
    TemplatePath.removeExtension("./test/stubs.njk", ".hbs"),
    "./test/stubs.njk"
  );
  t.is(
    TemplatePath.removeExtension("./test/stubs.hbs", ".hbs"),
    "./test/stubs"
  );
});
