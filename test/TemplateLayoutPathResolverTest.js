import test from "ava";
import TemplateLayoutPathResolver from "../src/TemplateLayoutPathResolver";

test("Layout", t => {
  t.is(
    new TemplateLayoutPathResolver("default", "./test/stubs").getFileName(),
    "default.ejs"
  );
});

test("Layout already has extension", t => {
  t.is(
    new TemplateLayoutPathResolver("default.ejs", "./test/stubs").getFileName(),
    "default.ejs"
  );
});

test("Layout (uses empty string includes folder)", t => {
  let res = new TemplateLayoutPathResolver(
    "includesemptystring",
    "./test/stubs"
  );
  res.config = {
    templateFormats: ["ejs"],
    dir: {
      includes: ""
    }
  };

  t.is(res.getFileName(), "includesemptystring.ejs");
});

test("Layout (uses empty string includes folder) already has extension", t => {
  let res = new TemplateLayoutPathResolver(
    "includesemptystring.ejs",
    "./test/stubs"
  );
  res.config = {
    templateFormats: ["ejs"],
    dir: {
      includes: ""
    }
  };

  t.is(res.getFileName(), "includesemptystring.ejs");
});

test("Layout (uses layouts folder)", t => {
  let res = new TemplateLayoutPathResolver("layoutsdefault", "./test/stubs");
  res.config = {
    templateFormats: ["ejs"],
    dir: {
      layouts: "_layouts",
      includes: "_includes"
    }
  };

  t.is(res.getFileName(), "layoutsdefault.ejs");
});

test("Layout (uses layouts folder) already has extension", t => {
  let res = new TemplateLayoutPathResolver(
    "layoutsdefault.ejs",
    "./test/stubs"
  );
  res.config = {
    templateFormats: ["ejs"],
    dir: {
      layouts: "_layouts",
      includes: "_includes"
    }
  };

  t.is(res.getFileName(), "layoutsdefault.ejs");
});

test("Layout (uses empty string layouts folder)", t => {
  let res = new TemplateLayoutPathResolver(
    "layoutsemptystring",
    "./test/stubs"
  );
  res.config = {
    templateFormats: ["ejs"],
    dir: {
      layouts: "",
      includes: "_includes"
    }
  };

  t.is(res.getFileName(), "layoutsemptystring.ejs");
});

test("Layout (uses empty string layouts folder) already has extension", t => {
  let res = new TemplateLayoutPathResolver(
    "layoutsemptystring.ejs",
    "./test/stubs"
  );
  res.config = {
    templateFormats: ["ejs"],
    dir: {
      layouts: "",
      includes: "_includes"
    }
  };

  t.is(res.getFileName(), "layoutsemptystring.ejs");
});

test("Layout subdir", t => {
  t.is(
    new TemplateLayoutPathResolver(
      "layouts/inasubdir",
      "./test/stubs"
    ).getFileName(),
    "layouts/inasubdir.njk"
  );
});

test("Layout subdir already has extension", t => {
  t.is(
    new TemplateLayoutPathResolver(
      "layouts/inasubdir.njk",
      "./test/stubs"
    ).getFileName(),
    "layouts/inasubdir.njk"
  );
});

test("Multiple layouts exist with the same file base, pick one", t => {
  // pick the first one if multiple exist.
  t.is(
    new TemplateLayoutPathResolver("multiple", "./test/stubs").getFileName(),
    "multiple.ejs"
  );
});

test("Multiple layouts exist but we are being explicit—layout already has extension", t => {
  t.is(
    new TemplateLayoutPathResolver(
      "multiple.ejs",
      "./test/stubs"
    ).getFileName(),
    "multiple.ejs"
  );
  t.is(
    new TemplateLayoutPathResolver("multiple.md", "./test/stubs").getFileName(),
    "multiple.md"
  );
});

test("Layout is aliased to a new location", t => {
  let tl = new TemplateLayoutPathResolver("post", "./test/stubs");
  tl.addLayoutAlias("post", "layouts/post.ejs");
  tl.init();

  t.is(tl.getFileName(), "layouts/post.ejs");
});

test("Global default with empty string alias", t => {
  let tl = new TemplateLayoutPathResolver("", "./test/stubs");
  tl.addLayoutAlias("", "layouts/post.ejs");
  tl.init();

  t.is(tl.getFileName(), "layouts/post.ejs");
});

test("Global default with empty string alias (but no alias exists for this instance)", t => {
  let tl = new TemplateLayoutPathResolver("layout.ejs", "./test/stubs");
  tl.addLayoutAlias("", "layouts/post.ejs");
  tl.init();

  t.throws(() => {
    tl.getFileName();
  });
});

test("Layout has no alias and does not exist", async t => {
  let tl = new TemplateLayoutPathResolver("shouldnotexist", "./test/stubs");
  tl.addLayoutAlias("post", "layouts/post.ejs");
  tl.init();

  t.throws(() => {
    tl.getFileName();
  });

  t.throws(() => {
    tl.getFullPath();
  });
});
