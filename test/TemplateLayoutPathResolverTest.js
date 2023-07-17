const test = require("ava");
const TemplateConfig = require("../src/TemplateConfig");
const TemplateLayoutPathResolver = require("../src/TemplateLayoutPathResolver");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");

function getResolverInstance(path, inputDir, { eleventyConfig, map } = {}) {
  if (!eleventyConfig) {
    eleventyConfig = new TemplateConfig();
  }

  if (!map) {
    map = new EleventyExtensionMap(["liquid", "md", "njk", "html", "11ty.js"], eleventyConfig);
  }

  return new TemplateLayoutPathResolver(path, inputDir, map, eleventyConfig);
}

test("Layout", (t) => {
  let res = getResolverInstance("default", "./test/stubs");
  t.is(res.getFileName(), "default.liquid");
});

test("Layout already has extension", (t) => {
  let res = getResolverInstance("default.liquid", "./test/stubs");
  t.is(res.getFileName(), "default.liquid");
});

test("Layout (uses empty string includes folder)", (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.appendToRootConfig({
    templateFormats: ["liquid"],
    dir: {
      includes: "",
    },
  });

  let res = getResolverInstance("includesemptystring", "./test/stubs", {
    eleventyConfig,
  });

  t.is(res.getFileName(), "includesemptystring.liquid");
});

test("Layout (uses empty string includes folder) already has extension", (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.appendToRootConfig({
    templateFormats: ["liquid"],
    dir: {
      includes: "",
    },
  });

  let res = getResolverInstance("includesemptystring.liquid", "./test/stubs", {
    eleventyConfig,
  });

  t.is(res.getFileName(), "includesemptystring.liquid");
});

test("Layout (uses layouts folder)", (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.appendToRootConfig({
    templateFormats: ["liquid"],
    dir: {
      layouts: "_layouts",
      includes: "_includes",
    },
  });

  let res = getResolverInstance("layoutsdefault", "./test/stubs", {
    eleventyConfig,
  });

  t.is(res.getFileName(), "layoutsdefault.liquid");
});

test("Layout (uses layouts folder) already has extension", (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.appendToRootConfig({
    templateFormats: ["liquid"],
    dir: {
      layouts: "_layouts",
      includes: "_includes",
    },
  });

  let res = getResolverInstance("layoutsdefault.liquid", "./test/stubs", {
    eleventyConfig,
  });

  t.is(res.getFileName(), "layoutsdefault.liquid");
});

test("Layout (uses empty string layouts folder)", (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.appendToRootConfig({
    templateFormats: ["liquid"],
    dir: {
      layouts: "",
      includes: "_includes",
    },
  });

  let res = getResolverInstance("layoutsemptystring", "./test/stubs", {
    eleventyConfig,
  });

  t.is(res.getFileName(), "layoutsemptystring.liquid");
});

test("Layout (uses empty string layouts folder) no template resolution", (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.setLayoutResolution(false);

  eleventyConfig.appendToRootConfig({
    templateFormats: ["liquid"],
    dir: {
      layouts: "",
      includes: "_includes",
    },
  });

  let res = getResolverInstance("layoutsemptystring", "./test/stubs", {
    eleventyConfig,
  });

  t.throws(() => {
    res.getFileName();
  });
});

test("Layout (uses empty string layouts folder) already has extension", (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.appendToRootConfig({
    templateFormats: ["liquid"],
    dir: {
      layouts: "",
      includes: "_includes",
    },
  });

  let res = getResolverInstance("layoutsemptystring.liquid", "./test/stubs", {
    eleventyConfig,
  });

  t.is(res.getFileName(), "layoutsemptystring.liquid");
});

test("Layout subdir", (t) => {
  let res = getResolverInstance("layouts/inasubdir", "./test/stubs");
  t.is(res.getFileName(), "layouts/inasubdir.njk");
});

test("Layout subdir already has extension", (t) => {
  let res = getResolverInstance("layouts/inasubdir.njk", "./test/stubs");
  t.is(res.getFileName(), "layouts/inasubdir.njk");
});

test("Multiple layouts exist with the same file base, pick one", (t) => {
  let res = getResolverInstance("multiple", "./test/stubs");
  // pick the first one if multiple exist.
  t.is(res.getFileName(), "multiple.liquid");
});

test("Multiple layouts exist but we are being explicit—layout already has extension", (t) => {
  let res = getResolverInstance("multiple.liquid", "./test/stubs");
  t.is(res.getFileName(), "multiple.liquid");

  let res2 = getResolverInstance("multiple.md", "./test/stubs");
  t.is(res2.getFileName(), "multiple.md");
});

test("Layout is aliased to a new location", (t) => {
  let tl = getResolverInstance("post", "./test/stubs");
  tl.addLayoutAlias("post", "layouts/post.liquid");
  tl.init();

  t.is(tl.getFileName(), "layouts/post.liquid");
});

test("Global default with empty string alias", (t) => {
  let tl = getResolverInstance("", "./test/stubs");
  tl.addLayoutAlias("", "layouts/post.liquid");
  tl.init();

  t.is(tl.getFileName(), "layouts/post.liquid");
});

test("Global default with empty string alias (but no alias exists for this instance)", (t) => {
  let tl = getResolverInstance("layout.liquid", "./test/stubs");
  tl.addLayoutAlias("", "layouts/post.liquid");
  tl.init();

  t.throws(() => {
    tl.getFileName();
  });
});

test("Layout has no alias and does not exist", async (t) => {
  let tl = getResolverInstance("shouldnotexist", "./test/stubs");
  tl.addLayoutAlias("post", "layouts/post.liquid");
  tl.init();

  t.throws(() => {
    tl.getFileName();
  });

  t.throws(() => {
    tl.getFullPath();
  });
});
