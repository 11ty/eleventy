import test from "ava";
import globby from "globby";
import TemplatePath from "../src/TemplatePath";
import TemplateGlob from "../src/TemplateGlob";

test("TemplatePath assumptions", t => {
  t.is(TemplatePath.normalize("ignoredFolder"), "ignoredFolder");
  t.is(TemplatePath.normalize("./ignoredFolder"), "ignoredFolder");
  t.is(TemplatePath.normalize("./ignoredFolder/"), "ignoredFolder");
});

test("Normalize string argument", t => {
  t.deepEqual(TemplateGlob.map("views"), "./views");
  t.deepEqual(TemplateGlob.map("views/"), "./views");
  t.deepEqual(TemplateGlob.map("./views"), "./views");
  t.deepEqual(TemplateGlob.map("./views/"), "./views");
});

test("Normalize with nots", t => {
  t.deepEqual(TemplateGlob.map("!views"), "!./views");
  t.deepEqual(TemplateGlob.map("!views/"), "!./views");
  t.deepEqual(TemplateGlob.map("!./views"), "!./views");
  t.deepEqual(TemplateGlob.map("!./views/"), "!./views");
});

test("Normalize with globstar", t => {
  t.deepEqual(TemplateGlob.map("!views/**"), "!./views/**");
  t.deepEqual(TemplateGlob.map("!./views/**"), "!./views/**");
});

test("Normalize with globstar and star", t => {
  t.deepEqual(TemplateGlob.map("!views/**/*"), "!./views/**/*");
  t.deepEqual(TemplateGlob.map("!./views/**/*"), "!./views/**/*");
});

test("Normalize with globstar and star and file extension", t => {
  t.deepEqual(TemplateGlob.map("!views/**/*.json"), "!./views/**/*.json");
  t.deepEqual(TemplateGlob.map("!./views/**/*.json"), "!./views/**/*.json");
});

test("NormalizePath with globstar and star and file extension", t => {
  t.deepEqual(
    TemplateGlob.normalizePath("views", "/", "**/*.json"),
    "./views/**/*.json"
  );
  t.deepEqual(
    TemplateGlob.normalizePath("./views", "/", "**/*.json"),
    "./views/**/*.json"
  );
});

test("NormalizePath with globstar and star and file extension", t => {
  t.throws(() => {
    TemplateGlob.normalizePath("!views/**/*.json");
  });

  t.throws(() => {
    TemplateGlob.normalizePath("!views", "/", "**/*.json");
  });

  t.throws(() => {
    TemplateGlob.normalizePath("!./views/**/*.json");
  });

  t.throws(() => {
    TemplateGlob.normalizePath("!./views", "/", "**/*.json");
  });
});

test("Normalize array argument", t => {
  t.deepEqual(TemplateGlob.map(["views", "content"]), ["./views", "./content"]);
  t.deepEqual(TemplateGlob.map("views/"), "./views");
  t.deepEqual(TemplateGlob.map("./views"), "./views");
  t.deepEqual(TemplateGlob.map("./views/"), "./views");
});

test("matuzo project issue with globby assumptions", async t => {
  let dotslashincludes = await globby(
    TemplateGlob.map([
      "./test/stubs/globby/**/*.html",
      "!./test/stubs/globby/_includes/**/*",
      "!./test/stubs/globby/_data/**/*"
    ])
  );

  t.is(
    dotslashincludes.filter(function(file) {
      return file.indexOf("_includes") > -1;
    }).length,
    0
  );

  let globincludes = await globby(
    TemplateGlob.map([
      "test/stubs/globby/**/*.html",
      "!./test/stubs/globby/_includes/**/*",
      "!./test/stubs/globby/_data/**/*"
    ])
  );
  t.is(
    globincludes.filter(function(file) {
      return file.indexOf("_includes") > -1;
    }).length,
    0
  );
});

test("globby assumptions", async t => {
  let glob = await globby("test/stubs/ignoredFolder/**");
  t.is(glob.length, 1);

  let glob2 = await globby("test/stubs/ignoredFolder/**/*");
  t.is(glob2.length, 1);

  let glob3 = await globby([
    "./test/stubs/ignoredFolder/**/*.md",
    "!./test/stubs/ignoredFolder/**"
  ]);
  t.is(glob3.length, 0);

  let glob4 = await globby([
    "./test/stubs/ignoredFolder/*.md",
    "!./test/stubs/ignoredFolder/**"
  ]);
  t.is(glob4.length, 0);

  let glob5 = await globby([
    "./test/stubs/ignoredFolder/ignored.md",
    "!./test/stubs/ignoredFolder/**"
  ]);
  t.is(glob5.length, 0);
});
