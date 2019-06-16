import test from "ava";
import TemplatePassthrough from "../src/TemplatePassthrough";

const getTemplatePassthrough = (path, outputDir, inputDir) => {
  if (path instanceof Object) {
    return new TemplatePassthrough(path, outputDir, inputDir);
  }
  return new TemplatePassthrough(
    { inputPath: path, outputPath: true },
    outputDir,
    inputDir
  );
};

test("Constructor", t => {
  let pass = new TemplatePassthrough("avatar.png", "_site", ".");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Constructor Dry Run", t => {
  let pass = new TemplatePassthrough("avatar.png", "_site", ".");
  pass.setDryRun(true);
  t.is(pass.isDryRun, true);
});

test("Origin path isn’t included in output when targeting a directory", t => {
  let pass = new TemplatePassthrough("img", "_site", "_src");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/img");
});

test("Origin path isn’t included in output when targeting a directory several levels deep", t => {
  let pass = new TemplatePassthrough("img", "_site", "_src/subdir");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/img");
});

test("Target directory’s subdirectory structure is retained", t => {
  let pass = new TemplatePassthrough("subdir/img", "_site", "_src");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/subdir/img");
});

test("Origin path isn’t included in output when targeting a file", t => {
  let pass = new TemplatePassthrough("avatar.png", "_site", "_src");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Origin path isn’t included in output when targeting a file several levels deep", t => {
  let pass = new TemplatePassthrough("avatar.png", "_site", "_src/subdir/img");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Full input file path and deep input path", t => {
  t.is(
    new TemplatePassthrough(
      "src/views/avatar.png",
      "_site",
      "src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "src/views/avatar.png",
      "_site",
      "src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "src/views/avatar.png",
      "_site/",
      "src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "src/views/avatar.png",
      "./_site",
      "./src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "./src/views/avatar.png",
      "./_site/",
      "./src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    new TemplatePassthrough(
      "./src/views/avatar.png",
      "_site",
      "src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
});

test(".htaccess", t => {
  let pass = new TemplatePassthrough(".htaccess", "_site", ".");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/.htaccess");
});

test(".htaccess with input dir", t => {
  let pass = new TemplatePassthrough(".htaccess", "_site", "_src");
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/.htaccess");
});

test("getFiles where not glob and file does not exist", async t => {
  const inputPath = ".htaccess";
  let pass = getTemplatePassthrough(inputPath, "_site", "_src");
  t.truthy(pass);
  const files = await pass.getFiles(inputPath);
  t.deepEqual(files, []);
});

test("getFiles where not glob and directory does not exist", async t => {
  const inputPath = "./test/stubs/template-passthrough/static/not-exists/";
  let pass = getTemplatePassthrough(inputPath, "_site", "_src");
  t.truthy(pass);
  const files = await pass.getFiles(inputPath);
  t.deepEqual(files, []);
});

test("getFiles with glob", async t => {
  const inputPath = "./test/stubs/template-passthrough/static/**/";
  let pass = getTemplatePassthrough(
    "./test/stubs/template-passthrough/static/**/*",
    "_site",
    "_src"
  );
  t.truthy(pass);
  const files = await pass.getFiles(inputPath);
  t.deepEqual(files, [
    "./test/stubs/template-passthrough/static/test.css",
    "./test/stubs/template-passthrough/static/test.js",
    "./test/stubs/template-passthrough/static/nested/test-nested.css"
  ]);
});
test("getFiles with glob 2", async t => {
  const inputPath = "./test/stubs/template-passthrough/static/**/*.js";
  let pass = getTemplatePassthrough(
    "./test/stubs/template-passthrough/static/**/*",
    "_site",
    "_src"
  );
  t.truthy(pass);
  const files = await pass.getFiles(inputPath);
  t.deepEqual(files, ["./test/stubs/template-passthrough/static/test.js"]);
});

test("Directory where outputPath is true", async t => {
  let pass = getTemplatePassthrough(
    { inputPath: "./static", outputPath: true },
    "_site",
    "_src"
  );
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/static");
});

test("Nested directory where outputPath is remapped", async t => {
  let pass = getTemplatePassthrough(
    { inputPath: "./static/nested", outputPath: "./test" },
    "_site",
    "_src"
  );
  t.truthy(pass);
  t.is(pass.getOutputPath(), "_site/test");
});

test("Glob pattern", async t => {
  const globResolvedPath = "./test/stubs/template-passthrough/static/test.js";
  let pass = getTemplatePassthrough(
    {
      inputPath: "./test/stubs/template-passthrough/static/*.js",
      outputPath: "./directory/"
    },
    "_site",
    "_src"
  );
  t.truthy(pass);
  t.is(pass.getGlobOutputPath(globResolvedPath), "_site/directory/test.js");
});

// ToDo: Currently can't do :(
// test("File renamed", async t => {
//   let pass = getTemplatePassthrough(
//     {
//       inputPath: "./test/stubs/template-passthrough/static/test.js",
//       outputPath: "./rename.js"
//     },
//     "_site",
//     "_src"
//   );
//   t.truthy(pass);
//   t.is(pass.getOutputPath(), "_site/rename.js");
// });
