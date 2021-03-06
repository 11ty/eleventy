const test = require("ava");
const fastglob = require("fast-glob");
const EleventyFiles = require("../src/EleventyFiles");
const TemplatePath = require("../src/TemplatePath");
const TemplateConfig = require("../src/TemplateConfig");
const TemplatePassthroughManager = require("../src/TemplatePassthroughManager");

test("Dirs paths", async (t) => {
  let eleventyConfig = new TemplateConfig({
    dir: {
      input: "src",
      includes: "includes",
      data: "data",
      output: "dist",
    },
  });

  let evf = new EleventyFiles("src", "dist", [], eleventyConfig);

  t.deepEqual(evf.inputDir, "src");
  t.deepEqual(evf.includesDir, "src/includes");
  t.deepEqual(evf.getDataDir(), "src/data");
  t.deepEqual(evf.outputDir, "dist");
});

test("Dirs paths (relative)", async (t) => {
  let eleventyConfig = new TemplateConfig({
    dir: {
      input: "src",
      includes: "../includes",
      data: "../data",
      output: "dist",
    },
  });

  let evf = new EleventyFiles("src", "dist", [], eleventyConfig);

  t.deepEqual(evf.inputDir, "src");
  t.deepEqual(evf.includesDir, "includes");
  t.deepEqual(evf.getDataDir(), "data");
  t.deepEqual(evf.outputDir, "dist");
});

test("getFiles", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(await evf.getFiles(), ["./test/stubs/writeTest/test.md"]);
});

test("getFiles (without 11ty.js)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "./test/stubs/writeTestJS",
    "./test/stubs/_writeTestJSSite",
    ["ejs", "md"],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(await evf.getFiles(), []);
});

test("getFiles (with 11ty.js)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "./test/stubs/writeTestJS",
    "./test/stubs/_writeTestJSSite",
    ["ejs", "md", "11ty.js"],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(await evf.getFiles(), ["./test/stubs/writeTestJS/test.11ty.js"]);
});

test("getFiles (with js, treated as passthrough copy)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "./test/stubs/writeTestJS",
    "./test/stubs/_writeTestJSSite",
    ["ejs", "md", "js"],
    eleventyConfig
  );
  evf.init();

  const files = await evf.getFiles();
  t.deepEqual(
    files.sort(),
    [
      "./test/stubs/writeTestJS/sample.js",
      "./test/stubs/writeTestJS/test.11ty.js",
    ].sort()
  );

  t.false(evf.extensionMap.hasEngine("./test/stubs/writeTestJS/sample.js"));
  t.true(evf.extensionMap.hasEngine("./test/stubs/writeTestJS/test.11ty.js"));
});

test("getFiles (with case insensitivity)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "./test/stubs/writeTestJS-casesensitive",
    "./test/stubs/_writeTestJSCaseSensitiveSite",
    ["JS"],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(
    (await evf.getFiles()).sort(),
    [
      "./test/stubs/writeTestJS-casesensitive/sample.Js",
      "./test/stubs/writeTestJS-casesensitive/test.11Ty.js",
    ].sort()
  );
  t.false(
    evf.extensionMap.hasEngine(
      "./test/stubs/writeTestJS-casesensitive/sample.Js"
    )
  );
  t.true(
    evf.extensionMap.hasEngine(
      "./test/stubs/writeTestJS-casesensitive/test.11Ty.js"
    )
  );
});

test("Mutually exclusive Input and Output dirs", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"],
    eleventyConfig
  );
  evf.init();

  let files = await fastglob(evf.getFileGlobs());
  t.is(evf.getRawFiles().length, 2);
  t.true(files.length > 0);
  t.is(files[0], "./test/stubs/writeTest/test.md");
});

test("Single File Input (deep path)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "./test/stubs/index.html",
    "./test/stubs/_site",
    ["ejs", "md"],
    eleventyConfig
  );
  evf.init();

  let files = await fastglob(evf.getFileGlobs());
  t.is(evf.getRawFiles().length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./test/stubs/index.html");
});

test("Single File Input (shallow path)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "README.md",
    "./test/stubs/_site",
    ["md"],
    eleventyConfig
  );
  evf.init();

  let globs = evf.getFileGlobs().filter((path) => path !== "!./README.md");
  let files = await fastglob(globs);
  t.is(evf.getRawFiles().length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./README.md");
});

test("Glob Input", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "./test/stubs/glob-pages/!(contact.md)",
    "./test/stubs/_site",
    ["md"],
    eleventyConfig
  );
  evf.init();

  let globs = evf.getFileGlobs();
  let files = await fastglob(globs);

  t.is(files.length, 2);
  t.is(files[0], "./test/stubs/glob-pages/about.md");
  t.is(files[1], "./test/stubs/glob-pages/home.md");
});

test(".eleventyignore parsing", (t) => {
  let ignores = EleventyFiles.getFileIgnores("./test/stubs/.eleventyignore");
  t.is(ignores.length, 2);
  t.is(ignores[0], "!./test/stubs/ignoredFolder/**");
  t.is(ignores[1], "!./test/stubs/ignoredFolder/ignored.md");
});

test("Parse multiple .eleventyignores", (t) => {
  let ignores = EleventyFiles.getFileIgnores([
    "./test/stubs/multiple-ignores/.eleventyignore",
    "./test/stubs/multiple-ignores/subfolder/.eleventyignore",
  ]);
  t.is(ignores.length, 4);
  // Note these folders must exist!
  t.is(ignores[0], "!./test/stubs/multiple-ignores/ignoredFolder/**");
  t.is(ignores[1], "!./test/stubs/multiple-ignores/ignoredFolder/ignored.md");
  t.is(
    ignores[2],
    "!./test/stubs/multiple-ignores/subfolder/ignoredFolder2/**"
  );
  t.is(
    ignores[3],
    "!./test/stubs/multiple-ignores/subfolder/ignoredFolder2/ignored2.md"
  );
});

test("defaults if passed file name does not exist", (t) => {
  let ignores = EleventyFiles.getFileIgnores(
    ".thisfiledoesnotexist",
    "node_modules/**"
  );
  t.truthy(ignores.length);
  t.is(ignores[0], "!./node_modules/**");
});

test(".eleventyignore files", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    ["ejs", "md"],
    eleventyConfig
  );
  evf.init();
  let ignoredFiles = await fastglob("test/stubs/ignoredFolder/*.md");
  t.is(ignoredFiles.length, 1);

  let files = await fastglob(evf.getFileGlobs());

  t.true(files.length > 0);

  t.is(
    files.filter((file) => {
      return file.indexOf("./test/stubs/ignoredFolder") > -1;
    }).length,
    0
  );
});

/* .eleventyignore and .gitignore combos */
test("Get ignores (no .eleventyignore no .gitignore)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore1",
    "test/stubs/ignore1/_site",
    [],
    eleventyConfig
  );
  evf.init();

  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./node_modules/**",
    "!./test/stubs/ignorelocalroot/node_modules/**",
    "!./test/stubs/ignore1/node_modules/**",
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore1/_site/**",
  ]);
});

test("Get ignores (no .eleventyignore)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore2",
    "test/stubs/ignore2/_site",
    [],
    eleventyConfig
  );
  evf.init();
  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignore2/thisshouldnotexist12345",
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore2/_site/**",
  ]);
});

test("Get ignores (no .eleventyignore, using setUseGitIgnore(false))", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore2",
    "test/stubs/ignore2/_site",
    [],
    eleventyConfig
  );
  evf.init();

  evf._setConfig({
    useGitIgnore: false,
    dir: {
      includes: "_includes",
    },
  });
  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore2/_site/**",
  ]);
});

test("Get ignores (no .gitignore)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore3",
    "test/stubs/ignore3/_site",
    [],
    eleventyConfig
  );
  evf.init();
  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./node_modules/**",
    "!./test/stubs/ignorelocalroot/node_modules/**",
    "!./test/stubs/ignore3/node_modules/**",
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore3/ignoredFolder/**",
    "!./test/stubs/ignore3/ignoredFolder/ignored.md",
    "!./test/stubs/ignore3/_site/**",
  ]);
});

test("Get ignores (both .eleventyignore and .gitignore)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore4",
    "test/stubs/ignore4/_site",
    [],
    eleventyConfig
  );
  evf.init();
  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignore4/thisshouldnotexist12345",
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore4/ignoredFolder/**",
    "!./test/stubs/ignore4/ignoredFolder/ignored.md",
    "!./test/stubs/ignore4/_site/**",
  ]);
});

test("Get ignores (both .eleventyignore and .gitignore, using setUseGitIgnore(false))", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore4",
    "test/stubs/ignore4/_site",
    [],
    eleventyConfig
  );
  evf.init();

  evf._setConfig({
    useGitIgnore: false,
    dir: {
      includes: "_includes",
    },
  });
  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore4/ignoredFolder/**",
    "!./test/stubs/ignore4/ignoredFolder/ignored.md",
    "!./test/stubs/ignore4/_site/**",
  ]);
});

test("Get ignores (no .eleventyignore  .gitignore exists but empty)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore5",
    "test/stubs/ignore5/_site",
    [],
    eleventyConfig
  );
  evf.init();

  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./node_modules/**",
    "!./test/stubs/ignorelocalroot/node_modules/**",
    "!./test/stubs/ignore5/node_modules/**",
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore5/_site/**",
  ]);
});

test("Get ignores (both .eleventyignore and .gitignore exists, but .gitignore is empty)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore6",
    "test/stubs/ignore6/_site",
    [],
    eleventyConfig
  );
  evf.init();
  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./node_modules/**",
    "!./test/stubs/ignorelocalroot/node_modules/**",
    "!./test/stubs/ignore6/node_modules/**",
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore6/ignoredFolder/**",
    "!./test/stubs/ignore6/ignoredFolder/ignored.md",
    "!./test/stubs/ignore6/_site/**",
  ]);
});

test("Get ignores (no .eleventyignore  .gitignore exists but has spaces inside)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore7",
    "test/stubs/ignore7/_site",
    [],
    eleventyConfig
  );
  evf.init();

  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./node_modules/**",
    "!./test/stubs/ignorelocalroot/node_modules/**",
    "!./test/stubs/ignore7/node_modules/**",
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore7/_site/**",
  ]);
});

test("Get ignores (both .eleventyignore and .gitignore exists, but .gitignore has spaces inside)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore8",
    "test/stubs/ignore8/_site",
    [],
    eleventyConfig
  );
  evf.init();
  evf._setLocalPathRoot("./test/stubs/ignorelocalroot");

  t.deepEqual(evf.getIgnores(), [
    "!./node_modules/**",
    "!./test/stubs/ignorelocalroot/node_modules/**",
    "!./test/stubs/ignore8/node_modules/**",
    "!./test/stubs/ignorelocalroot/test.md",
    "!./test/stubs/ignore8/ignoredFolder/**",
    "!./test/stubs/ignore8/ignoredFolder/ignored.md",
    "!./test/stubs/ignore8/_site/**",
  ]);
});
/* End .eleventyignore and .gitignore combos */

test("getTemplateData caching", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    [],
    eleventyConfig
  );
  evf.init();
  let templateDataFirstCall = evf.templateData;
  let templateDataSecondCall = evf.templateData;
  t.is(templateDataFirstCall, templateDataSecondCall);
});

test("getDataDir", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(".", "_site", [], eleventyConfig);
  evf.init();
  t.is(evf.getDataDir(), "_data");
});

test("getDataDir subdir", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    [],
    eleventyConfig
  );
  evf.init();
  t.is(evf.getDataDir(), "test/stubs/_data");
});

test("Include and Data Dirs", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    [],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(evf._getIncludesAndDataDirs(), [
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);
});

test("Ignore Include and Data Dirs", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    [],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(evf._getIncludesAndDataDirIgnores(), [
    "!./test/stubs/_includes/**",
    "!./test/stubs/_data/**",
  ]);
});

test("Input to 'src' and empty includes dir (issue #403)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "src",
    "src/_site",
    ["md", "liquid", "html"],
    eleventyConfig
  );
  evf._setConfig({
    useGitIgnore: false,
    eleventyignoreOverride: "!./src/_includes/**",
    dir: {
      input: ".",
      output: "_site",
      includes: "",
      data: "_data",
    },
  });
  evf.init();

  t.deepEqual(evf.getFileGlobs(), [
    "./src/**/*.md",
    "./src/**/*.liquid",
    "./src/**/*.html",
    "!./src/_includes/**",
    "!./src/_site/**",
    "!./src/_data/**",
  ]);
});

test("Bad expected output, this indicates a bug upstream in a dependency.  Input to 'src' and empty includes dir (issue #403, full paths in eleventyignore)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs-403",
    "test/stubs-403/_site",
    ["liquid"],
    eleventyConfig
  );
  evf._setConfig({
    useGitIgnore: false,
    eleventyignoreOverride:
      "!" + TemplatePath.absolutePath("test/stubs-403/_includes") + "/**",
    dir: {
      input: "test/stubs-403",
      output: "_site",
      includes: "",
      data: false,
    },
  });
  evf.init();

  t.deepEqual(await evf.getFiles(), [
    "./test/stubs-403/template.liquid",
    // This is bad, because it uses an absolutePath above. it should be excluded
    "./test/stubs-403/_includes/include.liquid",
  ]);
});

test("Workaround for Bad expected output, this indicates a bug upstream in a dependency.  Input to 'src' and empty includes dir (issue #403, full paths in eleventyignore)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs-403",
    "test/stubs-403/_site",
    ["liquid"],
    eleventyConfig
  );
  evf._setConfig({
    useGitIgnore: false,
    eleventyignoreOverride: "!./test/stubs-403/_includes/**",
    dir: {
      input: "test/stubs-403",
      output: "_site",
      includes: "",
      data: false,
    },
  });
  evf.init();

  t.deepEqual(await evf.getFiles(), ["./test/stubs-403/template.liquid"]);
});

test("Issue #403: all .eleventyignores should be relative paths not absolute paths", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs-403",
    "test/stubs-403/_site",
    ["liquid"],
    eleventyConfig
  );
  evf._setConfig({
    useGitIgnore: false,
    dir: {
      input: "test/stubs-403",
      output: "_site",
      includes: "",
      data: false,
    },
  });
  evf.init();

  let globs = await evf.getFileGlobs();
  t.is(
    globs.filter((glob) => {
      return glob.indexOf(TemplatePath.absolutePath()) > -1;
    }).length,
    0
  );
});

test("Glob Watcher Files", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    ["njk"],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);
});

test("Glob Watcher Files with File Extension Passthroughs", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    ["njk", "png"],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/**/*.png",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);
});

test("Glob Watcher Files with Config Passthroughs (one template format)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.passthroughCopies = {
    "test/stubs/img/": true,
  };
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    ["njk"],
    eleventyConfig
  );
  evf.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  mgr.setInputDir("test/stubs");
  mgr.setOutputDir("test/stubs/_site");
  evf.setPassthroughManager(mgr);

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/img/**",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);
});

test("Glob Watcher Files with Config Passthroughs (no template formats)", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    [],
    eleventyConfig
  );
  evf.init();

  t.deepEqual(await evf.getGlobWatcherTemplateDataFiles(), [
    "./test/stubs/**/*.json",
    "./test/stubs/**/*.11tydata.cjs",
    "./test/stubs/**/*.11tydata.js",
  ]);
});

test("Glob Watcher Files with passthroughAll", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs",
    "test/stubs/_site",
    [],
    eleventyConfig
  );
  evf.setPassthroughAll(true);
  evf.init();

  t.is((await evf.getFileGlobs())[0], "./test/stubs/**");
});

test("Test that negations are ignored (for now) PR#709, will change when #693 is implemented", async (t) => {
  t.deepEqual(
    EleventyFiles.normalizeIgnoreContent(
      "./",
      `hello
!testing`
    ),
    ["!./hello"]
  );
});
