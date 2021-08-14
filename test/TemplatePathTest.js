const test = require("ava");
const fs = require("fs");
const TemplatePath = require("../src/TemplatePath");

test("getDir", (t) => {
  t.is(TemplatePath.getDir("README.md"), ".");
  t.is(TemplatePath.getDir("test/stubs/config.js"), "test/stubs");
  t.is(TemplatePath.getDir("./test/stubs/config.js"), "./test/stubs");
  t.is(TemplatePath.getDir("test/stubs/*.md"), "test/stubs");
  t.is(TemplatePath.getDir("test/stubs/**"), "test/stubs");
  t.is(TemplatePath.getDir("test/stubs/!(multiple.md)"), "test/stubs");
});

test("getDirFromFilePath", (t) => {
  t.is(TemplatePath.getDirFromFilePath("test/stubs/*.md"), "test/stubs");
  t.is(TemplatePath.getDirFromFilePath("test/stubs/!(x.md)"), "test/stubs");
});

test("getLastPathSegment", (t) => {
  t.is(TemplatePath.getLastPathSegment("./testing/hello"), "hello");
  t.is(TemplatePath.getLastPathSegment("./testing"), "testing");
  t.is(TemplatePath.getLastPathSegment("./testing/"), "testing");
  t.is(TemplatePath.getLastPathSegment("testing/"), "testing");
  t.is(TemplatePath.getLastPathSegment("testing"), "testing");
});

test("getAllDirs", (t) => {
  t.deepEqual(TemplatePath.getAllDirs("."), ["."]);
  t.deepEqual(TemplatePath.getAllDirs("./"), ["."]);
  t.deepEqual(TemplatePath.getAllDirs("./testing"), ["./testing"]);
  t.deepEqual(TemplatePath.getAllDirs("./testing/"), ["./testing"]);
  t.deepEqual(TemplatePath.getAllDirs("testing/"), ["testing"]);
  t.deepEqual(TemplatePath.getAllDirs("testing"), ["testing"]);

  t.deepEqual(TemplatePath.getAllDirs("./testing/hello"), [
    "./testing/hello",
    "./testing",
  ]);

  t.deepEqual(TemplatePath.getAllDirs("./src/collections/posts"), [
    "./src/collections/posts",
    "./src/collections",
    "./src",
  ]);

  t.deepEqual(
    TemplatePath.getAllDirs("./src/site/content/en/paths/performanceAudits"),
    [
      "./src/site/content/en/paths/performanceAudits",
      "./src/site/content/en/paths",
      "./src/site/content/en",
      "./src/site/content",
      "./src/site",
      "./src",
    ]
  );

  t.deepEqual(TemplatePath.getAllDirs("./src/_site/src"), [
    "./src/_site/src",
    "./src/_site",
    "./src",
  ]);

  t.deepEqual(TemplatePath.getAllDirs("./src/_site/src/src/src"), [
    "./src/_site/src/src/src",
    "./src/_site/src/src",
    "./src/_site/src",
    "./src/_site",
    "./src",
  ]);
});

test("normalize", async (t) => {
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

  t.is(TemplatePath.normalize(".htaccess"), ".htaccess");
});

test("join", async (t) => {
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

test("normalizeUrlPath", (t) => {
  t.is(TemplatePath.normalizeUrlPath(""), ".");
  t.is(TemplatePath.normalizeUrlPath("."), ".");
  t.is(TemplatePath.normalizeUrlPath("./"), "./");
  t.is(TemplatePath.normalizeUrlPath(".."), "..");
  t.is(TemplatePath.normalizeUrlPath("../"), "../");

  t.is(TemplatePath.normalizeUrlPath("/"), "/");
  t.is(TemplatePath.normalizeUrlPath("//"), "/");
  t.is(TemplatePath.normalizeUrlPath("/../"), "/");
  t.is(TemplatePath.normalizeUrlPath("/test"), "/test");
  t.is(TemplatePath.normalizeUrlPath("/test/"), "/test/");
  t.is(TemplatePath.normalizeUrlPath("/test//"), "/test/");
  t.is(TemplatePath.normalizeUrlPath("/test/../"), "/");
  t.is(TemplatePath.normalizeUrlPath("/test/../../"), "/");
});

test("absolutePath", (t) => {
  t.is(
    TemplatePath.absolutePath(".eleventy.js").split("/").pop(),
    ".eleventy.js"
  );
  t.is(TemplatePath.absolutePath("/tmp/.eleventy.js"), "/tmp/.eleventy.js");
  t.is(
    TemplatePath.absolutePath("/var/task/", ".eleventy.js"),
    "/var/task/.eleventy.js"
  );

  t.throws(() => {
    TemplatePath.absolutePath("/var/task/", "/var/task/.eleventy.js");
  });

  t.throws(() => {
    TemplatePath.absolutePath("file1.js", "test/file2.js", "/tmp/.eleventy.js");
  });
});

test("absolutePath and relativePath", (t) => {
  t.is(
    TemplatePath.relativePath(TemplatePath.absolutePath(".eleventy.js")),
    ".eleventy.js"
  );
});

test("addLeadingDotSlash", (t) => {
  t.is(TemplatePath.addLeadingDotSlash("."), "./");
  t.is(TemplatePath.addLeadingDotSlash(".."), "../");
  t.is(TemplatePath.addLeadingDotSlash("./test/stubs"), "./test/stubs");
  t.is(TemplatePath.addLeadingDotSlash("./dist"), "./dist");
  t.is(TemplatePath.addLeadingDotSlash("../dist"), "../dist");
  t.is(TemplatePath.addLeadingDotSlash("/dist"), "/dist");
  t.is(TemplatePath.addLeadingDotSlash("dist"), "./dist");
  t.is(TemplatePath.addLeadingDotSlash(".nyc_output"), "./.nyc_output");

  // TODO How to test this on Windows? path.isAbsolute is OS dependent 😱
  // let windowsAbsolutePath = `C:\\Users\\$USER\\$PROJECT\\netlify\\functions\\serverless\\index`;
  // t.is(TemplatePath.addLeadingDotSlash(windowsAbsolutePath), windowsAbsolutePath);
});

test("addLeadingDotSlashArray", (t) => {
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["."]), ["./"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray([".."]), ["../"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["./test/stubs"]), [
    "./test/stubs",
  ]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["./dist"]), ["./dist"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["../dist"]), ["../dist"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["/dist"]), ["/dist"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray(["dist"]), ["./dist"]);
  t.deepEqual(TemplatePath.addLeadingDotSlashArray([".nyc_output"]), [
    "./.nyc_output",
  ]);
});

test("stripLeadingDotSlash", (t) => {
  t.is(TemplatePath.stripLeadingDotSlash("./test/stubs"), "test/stubs");
  t.is(TemplatePath.stripLeadingDotSlash("./dist"), "dist");
  t.is(TemplatePath.stripLeadingDotSlash("../dist"), "../dist");
  t.is(TemplatePath.stripLeadingDotSlash("dist"), "dist");

  t.is(TemplatePath.stripLeadingDotSlash(".htaccess"), ".htaccess");
});

test("startsWithSubPath", (t) => {
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

test("stripLeadingSubPath", (t) => {
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

test("convertToRecursiveGlobSync", (t) => {
  t.is(TemplatePath.convertToRecursiveGlobSync(""), "./**");
  t.is(TemplatePath.convertToRecursiveGlobSync("."), "./**");
  t.is(TemplatePath.convertToRecursiveGlobSync("./"), "./**");
  t.is(
    TemplatePath.convertToRecursiveGlobSync("test/stubs"),
    "./test/stubs/**"
  );
  t.is(
    TemplatePath.convertToRecursiveGlobSync("test/stubs/"),
    "./test/stubs/**"
  );
  t.is(
    TemplatePath.convertToRecursiveGlobSync("./test/stubs/"),
    "./test/stubs/**"
  );
  t.is(
    TemplatePath.convertToRecursiveGlobSync("./test/stubs/config.js"),
    "./test/stubs/config.js"
  );
});

test("convertToRecursiveGlob", async (t) => {
  t.is(await TemplatePath.convertToRecursiveGlob(""), "./**");
  t.is(await TemplatePath.convertToRecursiveGlob("."), "./**");
  t.is(await TemplatePath.convertToRecursiveGlob("./"), "./**");
  t.is(
    await TemplatePath.convertToRecursiveGlob("test/stubs"),
    "./test/stubs/**"
  );
  t.is(
    await TemplatePath.convertToRecursiveGlob("test/stubs/"),
    "./test/stubs/**"
  );
  t.is(
    await TemplatePath.convertToRecursiveGlob("./test/stubs/"),
    "./test/stubs/**"
  );
  t.is(
    await TemplatePath.convertToRecursiveGlob("./test/stubs/config.js"),
    "./test/stubs/config.js"
  );
});

test("getExtension", (t) => {
  t.is(TemplatePath.getExtension(""), "");
  t.is(TemplatePath.getExtension("test/stubs"), "");
  t.is(TemplatePath.getExtension("test/stubs.njk"), "njk");
  t.is(TemplatePath.getExtension("test/stubs.hbs"), "hbs");
});

test("removeExtension", (t) => {
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

test("isDirectorySync", (t) => {
  t.is(TemplatePath.isDirectorySync("asdlkfjklsadjflkja"), false);
  t.is(TemplatePath.isDirectorySync("test"), true);
  t.is(TemplatePath.isDirectorySync("test/stubs"), true);
  t.is(TemplatePath.isDirectorySync("test/stubs/.eleventyignore"), false);
});

test("isDirectory", async (t) => {
  t.is(await TemplatePath.isDirectory("asdlkfjklsadjflkja"), false);
  t.is(await TemplatePath.isDirectory("test"), true);
  t.is(await TemplatePath.isDirectory("test/stubs"), true);
  t.is(await TemplatePath.isDirectory("test/stubs/.eleventyignore"), false);
});

test("exists", async (t) => {
  t.is(fs.existsSync("asdlkfjklsadjflkja"), false);
  t.is(fs.existsSync("test"), true);
  t.is(fs.existsSync("test/stubs"), true);
  t.is(fs.existsSync("test/stubs/.eleventyignore"), true);
});
