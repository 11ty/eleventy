import fs from "fs-extra";
import test from "ava";
import globby from "globby";
import TemplateWriter from "../src/TemplateWriter";

test("Mutually exclusive Input and Output dirs", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/writeTest",
    "./test/stubs/_writeTestSite",
    ["ejs", "md"]
  );

  let files = await globby(tw.files);
  t.is(tw.rawFiles.length, 2);
  t.true(files.length > 0);
  t.is(files[0], "./test/stubs/writeTest/test.md");
});

// TODO make sure if output is a subdir of input dir that they don’t conflict.
test("Output is a subdir of input", async t => {
  let tw = new TemplateWriter(
    "./test/stubs/writeTest",
    "./test/stubs/writeTest/_writeTestSite",
    ["ejs", "md"]
  );
  let files = await globby(tw.files);
  t.is(tw.rawFiles.length, 2);
  t.true(files.length > 0);

  let tmpl = tw._getTemplate(files[0]);
  t.is(tmpl.inputDir, "./test/stubs/writeTest");
  t.is(
    await tmpl.getOutputPath(),
    "./test/stubs/writeTest/_writeTestSite/test/index.html"
  );

  // don’t write because this messes with ava’s watch
  // fs.removeSync( "./test/stubs/writeTest/_site" );
  // await tw.write();
  // t.true( fs.existsSync( "./test/stubs/writeTest/_site/test.html" ) );
});

test(".eleventyignore ignores parsing", t => {
  let ignores = new TemplateWriter.getFileIgnores("./test/stubs");
  t.is(ignores[0], "!test/stubs/ignoredFolder/**");
  t.is(ignores[1], "!test/stubs/ignoredFolder/ignored.md");
});

test(".eleventyignore files", async t => {
  let tw = new TemplateWriter("test/stubs", "test/stubs/_site", ["ejs", "md"]);
  let ignoredFiles = await globby("test/stubs/ignoredFolder/*.md");
  t.is(ignoredFiles.length, 1);

  let files = await globby(tw.files);
  t.true(files.length > 0);

  t.is(
    files.filter(file => {
      return file.indexOf("test/stubs/ignoredFolder") > -1;
    }).length,
    0
  );
});
