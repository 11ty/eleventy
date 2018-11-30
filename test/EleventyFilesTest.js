import test from "ava";
import fastglob from "fast-glob";
import EleventyFiles from "../src/EleventyFiles";
import EleventyExtensionMap from "../src/EleventyExtensionMap";
import TemplateRender from "../src/TemplateRender";
import TemplatePassthroughManager from "../src/TemplatePassthroughManager";

test("getFiles", async t => {
  let evf = new EleventyFiles(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"]
  );
  evf.init();

  t.deepEqual(await evf.getFiles(), ["./test/stubs/writeTest/test.md"]);
});

test("getFiles (without 11ty.js)", async t => {
  let evf = new EleventyFiles(
    "./test/stubs/writeTestJS",
    "./test/stubs/_writeTestJSSite",
    ["ejs", "md"]
  );
  evf.init();

  t.deepEqual(await evf.getFiles(), []);
});

test("getFiles (with 11ty.js)", async t => {
  let evf = new EleventyFiles(
    "./test/stubs/writeTestJS",
    "./test/stubs/_writeTestJSSite",
    ["ejs", "md", "11ty.js"]
  );
  evf.init();

  t.deepEqual(await evf.getFiles(), ["./test/stubs/writeTestJS/test.11ty.js"]);
});

test("getFiles (with js, treated as passthrough copy)", async t => {
  let evf = new EleventyFiles(
    "./test/stubs/writeTestJS",
    "./test/stubs/_writeTestJSSite",
    ["ejs", "md", "js"]
  );
  evf.init();

  t.deepEqual(await evf.getFiles(), [
    "./test/stubs/writeTestJS/sample.js",
    "./test/stubs/writeTestJS/test.11ty.js"
  ]);
  t.false(TemplateRender.hasEngine("./test/stubs/writeTestJS/sample.js"));
  t.true(TemplateRender.hasEngine("./test/stubs/writeTestJS/test.11ty.js"));
});

test("Mutually exclusive Input and Output dirs", async t => {
  let evf = new EleventyFiles(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"]
  );
  evf.init();

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
  evf.init();

  let files = await fastglob.async(evf.getFileGlobs());
  t.is(evf.getRawFiles().length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./test/stubs/index.html");
});

test("Single File Input (shallow path)", async t => {
  let evf = new EleventyFiles("README.md", "./test/stubs/_site", ["md"]);
  evf.init();

  let globs = evf.getFileGlobs().filter(path => path !== "!./README.md");
  let files = await fastglob.async(globs);
  t.is(evf.getRawFiles().length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./README.md");
});

test("Glob Input", async t => {
  let evf = new EleventyFiles(
    "./test/stubs/glob-pages/!(contact.md)",
    "./test/stubs/_site",
    ["md"]
  );
  evf.init();

  let globs = evf.getFileGlobs();
  let files = await fastglob.async(globs);
  t.is(files.length, 2);
  t.is(files[0], "./test/stubs/glob-pages/about.md");
  t.is(files[1], "./test/stubs/glob-pages/home.md");
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
  evf.init();
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
  evf.init();

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignore1/node_modules",
    "!./test/stubs/ignore1/_site/**"
  ]);
});

test("Get ignores (no .eleventyignore)", t => {
  let evf = new EleventyFiles(
    "test/stubs/ignore2",
    "test/stubs/ignore2/_site",
    []
  );
  evf.init();

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignore2/thisshouldnotexist12345",
    "!./test/stubs/ignore2/_site/**"
  ]);
});

test("Get ignores (no .eleventyignore, using setUseGitIgnore(false))", t => {
  let evf = new EleventyFiles(
    "test/stubs/ignore2",
    "test/stubs/ignore2/_site",
    []
  );
  evf.init();

  evf._setConfig({
    useGitIgnore: false
  });

  t.deepEqual(evf.getIgnores(), ["!./test/stubs/ignore2/_site/**"]);
});

test("Get ignores (no .gitignore)", t => {
  let evf = new EleventyFiles(
    "test/stubs/ignore3",
    "test/stubs/ignore3/_site",
    []
  );
  evf.init();

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignore3/node_modules",
    "!./test/stubs/ignore3/ignoredFolder/**",
    "!./test/stubs/ignore3/ignoredFolder/ignored.md",
    "!./test/stubs/ignore3/_site/**"
  ]);
});

test("Get ignores (both .eleventyignore and .gitignore)", t => {
  let evf = new EleventyFiles(
    "test/stubs/ignore4",
    "test/stubs/ignore4/_site",
    []
  );
  evf.init();

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignore4/thisshouldnotexist12345",
    "!./test/stubs/ignore4/ignoredFolder/**",
    "!./test/stubs/ignore4/ignoredFolder/ignored.md",
    "!./test/stubs/ignore4/_site/**"
  ]);
});

test("Get ignores (both .eleventyignore and .gitignore, using setUseGitIgnore(false))", t => {
  let evf = new EleventyFiles(
    "test/stubs/ignore4",
    "test/stubs/ignore4/_site",
    []
  );
  evf.init();

  evf._setConfig({
    useGitIgnore: false
  });

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignore4/ignoredFolder/**",
    "!./test/stubs/ignore4/ignoredFolder/ignored.md",
    "!./test/stubs/ignore4/_site/**"
  ]);
});
/* End .eleventyignore and .gitignore combos */

test("getDataDir", t => {
  let evf = new EleventyFiles(".", "_site", []);
  evf.init();
  t.is(evf.getDataDir(), "./_data");
});

test("getDataDir subdir", t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", []);
  evf.init();
  t.is(evf.getDataDir(), "test/stubs/_data");
});

test("Include and Data Dirs", t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", []);
  evf.init();

  t.deepEqual(evf.getIncludesAndDataDirs(), [
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**"
  ]);
});

test("Ignore Include and Data Dirs", t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", []);
  evf.init();

  t.deepEqual(evf.getTemplateIgnores(), [
    "!./test/stubs/_includes/**",
    "!./test/stubs/_data/**"
  ]);
});

test("Glob Watcher Files", async t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", ["njk"]);
  evf.init();

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**"
  ]);
});

test("Glob Watcher Files with File Extension Passthroughs", async t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", ["njk", "png"]);
  evf.init();

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/**/*.png",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**"
  ]);
});

test("Glob Watcher Files with Config Passthroughs", async t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", ["njk"]);
  evf.init();

  let mgr = new TemplatePassthroughManager();
  mgr.setInputDir("test/stubs");
  mgr.setOutputDir("test/stubs/_site");
  mgr.setConfig({
    passthroughFileCopy: true,
    passthroughCopies: {
      "test/stubs/img/": true
    }
  });
  evf.setPassthroughManager(mgr);

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
    "./test/stubs/img/**"
  ]);
});

test("Glob Watcher Files with Config Passthroughs", async t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", []);
  evf.init();

  t.deepEqual(await evf.getGlobWatcherTemplateDataFiles(), [
    "./test/stubs/**/*.json",
    "./test/stubs/**/*.11tydata.js"
  ]);
});

test("Glob Watcher Files with passthroughAll", async t => {
  let evf = new EleventyFiles("test/stubs", "test/stubs/_site", [], true);
  evf.init();

  t.is((await evf.getFileGlobs())[0], "./test/stubs/**");
});

test("File extension aliasing", async t => {
  let map = new EleventyExtensionMap(["md"]);
  map.setConfig({
    templateExtensionAliases: {
      markdown: "md"
    }
  });

  let evf = new EleventyFiles(
    "./test/stubs/writeTestMarkdown",
    "./test/stubs/_writeTestMarkdownSite",
    ["md"]
  );
  evf._setExtensionMap(map);
  evf.init();

  t.deepEqual(await evf.getFiles(), [
    "./test/stubs/writeTestMarkdown/sample.md",
    "./test/stubs/writeTestMarkdown/sample2.markdown"
  ]);
});
