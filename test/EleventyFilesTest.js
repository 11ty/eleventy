import test from "ava";
import fastglob from "fast-glob";
import EleventyFiles from "../src/EleventyFiles";
import TemplatePassthroughManager from "../src/TemplatePassthroughManager";

test("getFiles", async t => {
  let evf = new EleventyFiles(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"]
  );

  t.deepEqual(await evf.getFiles(), ["./test/stubs/writeTest/test.md"]);
});

test("Mutually exclusive Input and Output dirs", async t => {
  let evf = new EleventyFiles(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"]
  );

  let files = await fastglob.async(evf.getFileGlobs());
  t.is(evf.getRawFiles().length, 2);
  t.true(files.length > 0);
  t.is(files[0], "./test/stubs/writeTest/test.md");
});

test("Single File Input (deep path)", async t => {
  let evf = new EleventyFiles("./test/stubs/index.html", "./test/stubs/_site", [
    "ejs",
    "md"
  ]);

  let files = await fastglob.async(evf.getFileGlobs());
  t.is(evf.getRawFiles().length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./test/stubs/index.html");
});

test("Single File Input (shallow path)", async t => {
  let evf = new EleventyFiles("README.md", "./test/stubs/_site", ["md"]);

  let globs = evf.getFileGlobs().filter(path => path !== "!./README.md");
  let files = await fastglob.async(globs);
  t.is(evf.getRawFiles().length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./README.md");
});

test(".eleventyignore parsing", t => {
  let ignores = EleventyFiles.getFileIgnores("./test/stubs/.eleventyignore");
  t.is(ignores.length, 2);
  t.is(ignores[0], "!./test/stubs/ignoredFolder/**");
  t.is(ignores[1], "!./test/stubs/ignoredFolder/ignored.md");
});

test("defaults if passed file name does not exist", t => {
  let ignores = EleventyFiles.getFileIgnores(
    ".thisfiledoesnotexist",
    "node_modules/"
  );
  t.truthy(ignores.length);
  t.is(ignores[0], "!./node_modules/**");
});

test(".eleventyignore files", async t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", ["ejs", "md"]);
  let ignoredFiles = await fastglob.async("test/stubs/ignoredFolder/*.md");
  t.is(ignoredFiles.length, 1);

  let files = await fastglob.async(evf.getFileGlobs());
  t.true(files.length > 0);

  t.is(
    files.filter(file => {
      return file.indexOf("./test/stubs/ignoredFolder") > -1;
    }).length,
    0
  );
});

/* .eleventyignore and .gitignore combos */
test("Get ignores (no .eleventyignore no .gitignore)", t => {
  let evf = new EleventyFiles(
    "test/stubs/ignore1",
    "test/stubs/ignore1/_site",
    []
  );

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignore1/node_modules",
    "!./test/stubs/ignore1/_site/**"
  ]);
});

test("Get ignores (no .eleventyignore)", t => {
  let tw = new EleventyFiles(
    "test/stubs/ignore2",
    "test/stubs/ignore2/_site",
    []
  );

  t.deepEqual(tw.getIgnores(), [
    "!./test/stubs/ignore2/thisshouldnotexist12345",
    "!./test/stubs/ignore2/_site/**"
  ]);
});

test("Get ignores (no .eleventyignore, using setUseGitIgnore(false))", t => {
  let tw = new EleventyFiles(
    "test/stubs/ignore2",
    "test/stubs/ignore2/_site",
    []
  );

  tw.overrideConfig({
    useGitIgnore: false
  });

  t.deepEqual(tw.getIgnores(), ["!./test/stubs/ignore2/_site/**"]);
});

test("Get ignores (no .gitignore)", t => {
  let tw = new EleventyFiles(
    "test/stubs/ignore3",
    "test/stubs/ignore3/_site",
    []
  );

  t.deepEqual(tw.getIgnores(), [
    "!./test/stubs/ignore3/node_modules",
    "!./test/stubs/ignore3/ignoredFolder/**",
    "!./test/stubs/ignore3/ignoredFolder/ignored.md",
    "!./test/stubs/ignore3/_site/**"
  ]);
});

test("Get ignores (both .eleventyignore and .gitignore)", t => {
  let tw = new EleventyFiles(
    "test/stubs/ignore4",
    "test/stubs/ignore4/_site",
    []
  );

  t.deepEqual(tw.getIgnores(), [
    "!./test/stubs/ignore4/thisshouldnotexist12345",
    "!./test/stubs/ignore4/ignoredFolder/**",
    "!./test/stubs/ignore4/ignoredFolder/ignored.md",
    "!./test/stubs/ignore4/_site/**"
  ]);
});

test("Get ignores (both .eleventyignore and .gitignore, using setUseGitIgnore(false))", t => {
  let tw = new EleventyFiles(
    "test/stubs/ignore4",
    "test/stubs/ignore4/_site",
    []
  );

  tw.overrideConfig({
    useGitIgnore: false
  });

  t.deepEqual(tw.getIgnores(), [
    "!./test/stubs/ignore4/ignoredFolder/**",
    "!./test/stubs/ignore4/ignoredFolder/ignored.md",
    "!./test/stubs/ignore4/_site/**"
  ]);
});
/* End .eleventyignore and .gitignore combos */

test("getDataDir", t => {
  let tw = new EleventyFiles(".", "_site", []);
  t.is(tw.getDataDir(), "./_data");
});

test("getDataDir subdir", t => {
  let tw = new EleventyFiles("test/stubs", "test/stubs/_site", []);
  t.is(tw.getDataDir(), "test/stubs/_data");
});

test("Include and Data Dirs", t => {
  let tw = new EleventyFiles("test/stubs", "test/stubs/_site", []);

  t.deepEqual(tw.getIncludesAndDataDirs(), [
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**"
  ]);
});

test("Ignore Include and Data Dirs", t => {
  let tw = new EleventyFiles("test/stubs", "test/stubs/_site", []);

  t.deepEqual(tw.getTemplateIgnores(), [
    "!./test/stubs/_includes/**",
    "!./test/stubs/_data/**"
  ]);
});

test("Glob Watcher Files", async t => {
  let tw = new EleventyFiles("test/stubs", "test/stubs/_site", ["njk"]);

  t.deepEqual(tw.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**"
  ]);
});

test("Glob Watcher Files with File Extension Passthroughs", async t => {
  let tw = new EleventyFiles("test/stubs", "test/stubs/_site", ["njk", "png"]);

  t.deepEqual(tw.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/**/*.png",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**"
  ]);
});

test("Glob Watcher Files with Config Passthroughs", async t => {
  let tw = new EleventyFiles("test/stubs", "test/stubs/_site", ["njk"]);

  let mgr = new TemplatePassthroughManager();
  mgr.setInputDir("test/stubs");
  mgr.setOutputDir("test/stubs/_site");
  mgr.setConfig({
    passthroughFileCopy: true,
    passthroughCopies: {
      "test/stubs/img/": true
    }
  });
  tw.setPassthroughManager(mgr);

  t.deepEqual(tw.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
    "./test/stubs/img/**"
  ]);
});

test("Glob Watcher Files with Config Passthroughs", async t => {
  let tw = new EleventyFiles("test/stubs", "test/stubs/_site", []);

  t.deepEqual(await tw.getGlobWatcherTemplateDataFiles(), [
    "./test/stubs/**/*.json",
    "./test/stubs/**/*.11tydata.js"
  ]);
});

test("Glob Watcher Files with passthroughAll", async t => {
  let tw = new EleventyFiles("test/stubs", "test/stubs/_site", [], true);

  t.is((await tw.getFileGlobs())[0], "./test/stubs/**");
});
