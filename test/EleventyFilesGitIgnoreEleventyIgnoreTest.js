const test = require("ava");
const EleventyFiles = require("../src/EleventyFiles");
const TemplatePath = require("../src/TemplatePath");
const TemplateConfig = require("../src/TemplateConfig");

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
    "./node_modules/**",
    "./test/stubs/ignorelocalroot/node_modules/**",
    "./test/stubs/ignorelocalroot/test.md",
    "./test/stubs/ignore1/_site/**",
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
  evf._setLocalPathRoot("./test/stubs/ignorelocalrootgitignore");

  t.deepEqual(evf.getIgnores(), [
    "./test/stubs/ignorelocalrootgitignore/thisshouldnotexist12345",
    "./test/stubs/ignorelocalrootgitignore/test.md",
    "./test/stubs/ignore2/_site/**",
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
    "./test/stubs/ignorelocalroot/test.md",
    "./test/stubs/ignore2/_site/**",
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
    "./node_modules/**",
    "./test/stubs/ignorelocalroot/node_modules/**",
    "./test/stubs/ignorelocalroot/test.md",
    "./test/stubs/ignore3/ignoredFolder/**",
    "./test/stubs/ignore3/ignoredFolder/ignored.md",
    "./test/stubs/ignore3/_site/**",
  ]);
});

test("Get ignores (project .eleventyignore and root .gitignore)", (t) => {
  let eleventyConfig = new TemplateConfig();
  let evf = new EleventyFiles(
    "test/stubs/ignore4",
    "test/stubs/ignore4/_site",
    [],
    eleventyConfig
  );
  evf.init();
  evf._setLocalPathRoot("./test/stubs/ignorelocalrootgitignore");

  t.deepEqual(evf.getIgnores(), [
    "./test/stubs/ignorelocalrootgitignore/thisshouldnotexist12345",
    "./test/stubs/ignorelocalrootgitignore/test.md",
    "./test/stubs/ignore4/ignoredFolder/**",
    "./test/stubs/ignore4/ignoredFolder/ignored.md",
    "./test/stubs/ignore4/_site/**",
  ]);
});

test("Get ignores (project .eleventyignore and root .gitignore, using setUseGitIgnore(false))", (t) => {
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
  evf._setLocalPathRoot("./test/stubs/ignorelocalrootgitignore");

  t.deepEqual(evf.getIgnores(), [
    "./test/stubs/ignorelocalrootgitignore/test.md",
    "./test/stubs/ignore4/ignoredFolder/**",
    "./test/stubs/ignore4/ignoredFolder/ignored.md",
    "./test/stubs/ignore4/_site/**",
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
    "./node_modules/**",
    "./test/stubs/ignorelocalroot/node_modules/**",
    "./test/stubs/ignorelocalroot/test.md",
    "./test/stubs/ignore5/_site/**",
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
    "./node_modules/**",
    "./test/stubs/ignorelocalroot/node_modules/**",
    "./test/stubs/ignorelocalroot/test.md",
    "./test/stubs/ignore6/ignoredFolder/**",
    "./test/stubs/ignore6/ignoredFolder/ignored.md",
    "./test/stubs/ignore6/_site/**",
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
    "./node_modules/**",
    "./test/stubs/ignorelocalroot/node_modules/**",
    "./test/stubs/ignorelocalroot/test.md",
    "./test/stubs/ignore7/_site/**",
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
    "./node_modules/**",
    "./test/stubs/ignorelocalroot/node_modules/**",
    "./test/stubs/ignorelocalroot/test.md",
    "./test/stubs/ignore8/ignoredFolder/**",
    "./test/stubs/ignore8/ignoredFolder/ignored.md",
    "./test/stubs/ignore8/_site/**",
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
  evf.setEleventyIgnoreContent(
    "!" + TemplatePath.absolutePath("test/stubs-403/_includes") + "/**"
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
  evf.setEleventyIgnoreContent("!./test/stubs-403/_includes/**");
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
