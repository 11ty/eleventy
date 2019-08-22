import test from "ava";
import TemplatePassthrough from "../src/TemplatePassthrough";

const getTemplatePassthrough = (path, outputDir, inputDir) => {
  if (typeof path === "object") {
    return new TemplatePassthrough(path, outputDir, inputDir);
  }
  return new TemplatePassthrough(
    { inputPath: path, outputPath: true },
    outputDir,
    inputDir
  );
};

test("Constructor", t => {
  let pass = getTemplatePassthrough("avatar.png", "_site", ".");
  t.truthy(pass);
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Constructor, input directory in inputPath is stripped", t => {
  let pass = getTemplatePassthrough("src/avatar.png", "_site", "src");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/avatar.png");

  let pass2 = getTemplatePassthrough(
    { inputPath: "src/avatar.png", outputPath: "avatar.png" },
    "_site",
    "src"
  );
  t.is(pass2.outputPath, "avatar.png");
  t.is(pass2.getOutputPath(), "_site/avatar.png");
});

test("Constructor, input directory in inputPath is stripped, duplicate directory names", t => {
  let pass = getTemplatePassthrough("src/src/avatar.png", "_site", "src");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/src/avatar.png");

  let pass2 = getTemplatePassthrough(
    { inputPath: "src/src/avatar.png", outputPath: "src/avatar.png" },
    "_site",
    "src"
  );
  t.is(pass2.outputPath, "src/avatar.png");
  t.is(pass2.getOutputPath(), "_site/src/avatar.png");
});

test("Constructor, input directory (object param, directory)", t => {
  let pass = getTemplatePassthrough(
    { inputPath: "src/test", outputPath: "test" },
    "_site",
    "src"
  );
  t.is(pass.outputPath, "test");
  t.is(pass.getOutputPath(), "_site/test");
});

test("Constructor, input directory, path missing input directory", t => {
  let pass = getTemplatePassthrough("avatar.png", "_site", "src");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/avatar.png");

  let pass2 = getTemplatePassthrough(
    { inputPath: "avatar.png", outputPath: "avatar.png" },
    "_site",
    "src"
  );
  t.is(pass2.outputPath, "avatar.png");
  t.is(pass2.getOutputPath(), "_site/avatar.png");
});

test("Constructor Dry Run", t => {
  let pass = getTemplatePassthrough("avatar.png", "_site", ".");
  pass.setDryRun(true);
  t.is(pass.outputPath, true);
  t.is(pass.isDryRun, true);
});

test("Origin path isn’t included in output when targeting a directory", t => {
  let pass = getTemplatePassthrough("img", "_site", "_src");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/img");
});

test("Origin path isn’t included in output when targeting a directory several levels deep", t => {
  let pass = getTemplatePassthrough("img", "_site", "_src/subdir");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/img");
});

test("Target directory’s subdirectory structure is retained", t => {
  let pass = getTemplatePassthrough("subdir/img", "_site", "_src");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/subdir/img");

  let pass2 = getTemplatePassthrough(
    { inputPath: "subdir/img", outputPath: "subdir/img" },
    "_site",
    "_src"
  );
  t.is(pass2.getOutputPath(), "_site/subdir/img");
});

test("Origin path isn’t included in output when targeting a file", t => {
  let pass = getTemplatePassthrough("avatar.png", "_site", "_src");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Origin path isn’t included in output when targeting a file several levels deep", t => {
  let pass = getTemplatePassthrough("avatar.png", "_site", "_src/subdir/img");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/avatar.png");
});

test("Full input file path and deep input path", t => {
  t.is(
    getTemplatePassthrough(
      "src/views/avatar.png",
      "_site",
      "src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    getTemplatePassthrough(
      "src/views/avatar.png",
      "_site",
      "src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    getTemplatePassthrough(
      "src/views/avatar.png",
      "_site/",
      "src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    getTemplatePassthrough(
      "src/views/avatar.png",
      "./_site",
      "./src/views"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    getTemplatePassthrough(
      "./src/views/avatar.png",
      "./_site/",
      "./src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
  t.is(
    getTemplatePassthrough(
      "./src/views/avatar.png",
      "_site",
      "src/views/"
    ).getOutputPath(),
    "_site/avatar.png"
  );
});

test(".htaccess", t => {
  let pass = getTemplatePassthrough(".htaccess", "_site", ".");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/.htaccess");
});

test(".htaccess with input dir", t => {
  let pass = getTemplatePassthrough(".htaccess", "_site", "_src");
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/.htaccess");
});

test("getFiles where not glob and file does not exist", async t => {
  const inputPath = ".htaccess";
  let pass = getTemplatePassthrough(inputPath, "_site", "_src");
  t.is(pass.outputPath, true);
  const files = await pass.getFiles(inputPath);
  t.deepEqual(files, []);
});

test("getFiles where not glob and directory does not exist", async t => {
  const inputPath = "./test/stubs/template-passthrough/static/not-exists/";
  let pass = getTemplatePassthrough(inputPath, "_site", "_src");
  t.is(pass.outputPath, true);
  const files = await pass.getFiles(inputPath);
  t.deepEqual(files, []);
});

test("getFiles with glob", async t => {
  const inputPath = "./test/stubs/template-passthrough/static/**";
  let pass = getTemplatePassthrough(inputPath, "_site", "_src");
  t.is(pass.outputPath, true);

  const files = await pass.getFiles(inputPath);
  t.deepEqual(
    files.sort(),
    [
      "./test/stubs/template-passthrough/static/test.css",
      "./test/stubs/template-passthrough/static/test.js",
      "./test/stubs/template-passthrough/static/nested/test-nested.css"
    ].sort()
  );

  t.is(
    pass.getOutputPath(files.filter(entry => entry.endsWith("test.css"))[0]),
    "_site/test/stubs/template-passthrough/static/test.css"
  );
  t.is(
    pass.getOutputPath(files.filter(entry => entry.endsWith("test.js"))[0]),
    "_site/test/stubs/template-passthrough/static/test.js"
  );
  t.is(
    pass.getOutputPath(
      files.filter(entry => entry.endsWith("test-nested.css"))[0]
    ),
    "_site/test/stubs/template-passthrough/static/nested/test-nested.css"
  );
});
test("getFiles with glob 2", async t => {
  const inputPath = "./test/stubs/template-passthrough/static/**/*.js";
  let pass = getTemplatePassthrough(inputPath, "_site", "_src");
  t.is(pass.outputPath, true);
  const files = await pass.getFiles(inputPath);
  t.deepEqual(files, ["./test/stubs/template-passthrough/static/test.js"]);
  t.is(
    pass.getOutputPath(files[0]),
    "_site/test/stubs/template-passthrough/static/test.js"
  );
});

test("Directory where outputPath is true", async t => {
  let pass = getTemplatePassthrough(
    { inputPath: "./static", outputPath: true },
    "_site",
    "_src"
  );
  t.is(pass.outputPath, true);
  t.is(pass.getOutputPath(), "_site/static");
});

test("Nested directory where outputPath is remapped", async t => {
  let pass = getTemplatePassthrough(
    { inputPath: "./static/nested", outputPath: "./test" },
    "_site",
    "_src"
  );
  t.is(pass.outputPath, "./test");
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
  t.is(pass.outputPath, "./directory/");
  t.is(pass.getOutputPath(globResolvedPath), "_site/directory/test.js");
});

test("Output paths match with different templatePassthrough methods", async t => {
  let pass1 = getTemplatePassthrough(
    { inputPath: "./static/nested", outputPath: "./test" },
    "_site",
    "_src"
  );
  let pass2 = getTemplatePassthrough("avatar.png", "_site/test", ".");
  t.is(pass1.getOutputPathForGlobFile("avatar.png"), pass2.getOutputPath());
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
