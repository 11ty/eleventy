const test = require("ava");
const Eleventy = require("../src/Eleventy");
const EleventyWatchTargets = require("../src/EleventyWatchTargets");
const templateConfig = require("../src/Config");

const config = templateConfig.getConfig();

test("Eleventy, defaults inherit from config", async (t) => {
  let elev = new Eleventy();

  t.truthy(elev.input);
  t.truthy(elev.outputDir);
  t.is(elev.input, config.dir.input);
  t.is(elev.outputDir, config.dir.output);
});

test("Eleventy, get version", (t) => {
  let elev = new Eleventy();

  t.truthy(elev.getVersion());
});

test("Eleventy, get help", (t) => {
  let elev = new Eleventy();

  t.truthy(elev.getHelp());
});

test("Eleventy, set is verbose", (t) => {
  let elev = new Eleventy();
  elev.setIsVerbose(true);

  t.true(elev.verboseMode);
});

test("Eleventy set input/output", async (t) => {
  let elev = new Eleventy("./test/stubs", "./test/stubs/_site");

  t.is(elev.input, "./test/stubs");
  t.is(elev.outputDir, "./test/stubs/_site");

  await elev.init();
  t.truthy(elev.templateData);
  t.truthy(elev.writer);
});

test("Eleventy file watching", async (t) => {
  let elev = new Eleventy("./test/stubs", "./test/stubs/_site");
  elev.setFormats("njk");

  await elev.init();
  await elev.eleventyFiles.getFiles();
  await elev.initWatch();
  t.deepEqual(await elev.getWatchedFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
    "./.eleventy.js",
    "./test/stubs/**/*.json",
    "./test/stubs/**/*.11tydata.cjs",
    "./test/stubs/**/*.11tydata.js",
    "./test/stubs/deps/dep1.js",
    "./test/stubs/deps/dep2.js",
  ]);
});

test("Eleventy file watching (don’t watch deps of passthrough copy .js files)", async (t) => {
  let elev = new Eleventy("./test/stubs-1325", "./test/stubs-1325/_site");
  elev.setFormats("11ty.js,js");

  await elev.init();
  await elev.eleventyFiles.getFiles();
  await elev.initWatch();

  t.deepEqual(await elev.eleventyFiles.getWatchPathCache(), [
    "./test/stubs-1325/test.11ty.js",
  ]);
});

test("Eleventy file watching (no JS dependencies)", async (t) => {
  let elev = new Eleventy("./test/stubs", "./test/stubs/_site");
  elev.setFormats("njk");

  let wt = new EleventyWatchTargets();
  wt.watchJavaScriptDependencies = false;
  elev.setWatchTargets(wt);

  await elev.init();
  await elev.initWatch();
  t.deepEqual(await elev.getWatchedFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
    "./.eleventy.js",
    "./test/stubs/**/*.json",
    "./test/stubs/**/*.11tydata.cjs",
    "./test/stubs/**/*.11tydata.js",
  ]);
});

test("Eleventy set input/output, one file input", async (t) => {
  let elev = new Eleventy("./test/stubs/index.html", "./test/stubs/_site");

  t.is(elev.input, "./test/stubs/index.html");
  t.is(elev.inputDir, "./test/stubs");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input, deeper subdirectory", async (t) => {
  let elev = new Eleventy(
    "./test/stubs/subdir/index.html",
    "./test/stubs/_site"
  );
  elev.setInputDir("./test/stubs");

  t.is(elev.input, "./test/stubs/subdir/index.html");
  t.is(elev.inputDir, "./test/stubs");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input root dir", async (t) => {
  let elev = new Eleventy("./README.md", "./test/stubs/_site");

  t.is(elev.input, "./README.md");
  t.is(elev.inputDir, ".");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input root dir without leading dot/slash", async (t) => {
  let elev = new Eleventy("README.md", "./test/stubs/_site");

  t.is(elev.input, "README.md");
  t.is(elev.inputDir, ".");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input exitCode", async (t) => {
  let previousExitCode = process.exitCode;
  let elev = new Eleventy(
    "./test/stubs/exitCode/failure.njk",
    "./test/stubs/exitCode/_site"
  );
  elev.setIsVerbose(false);
  await elev.init();
  await elev.write();

  t.is(process.exitCode, 1);

  process.exitCode = previousExitCode;
});

test("Eleventy to json", async (t) => {
  let elev = new Eleventy("./test/stubs--to/");
  elev.setIsVerbose(false);

  await elev.init();

  let result = await elev.toJSON();

  t.deepEqual(
    result.filter((entry) => entry.url === "/test/"),
    [
      {
        url: "/test/",
        inputPath: "./test/stubs--to/test.md",
        content: "<h1>hi</h1>\n",
      },
    ]
  );
  t.deepEqual(
    result.filter((entry) => entry.url === "/test2/"),
    [
      {
        url: "/test2/",
        inputPath: "./test/stubs--to/test2.liquid",
        content: "hello",
      },
    ]
  );
});

test.cb("Eleventy to ndjson (returns a stream)", (t) => {
  let elev = new Eleventy("./test/stubs--to/");

  elev.setIsVerbose(false);

  elev.init().then(() => {
    elev.toNDJSON().then((stream) => {
      let results = [];
      stream.on("data", function (jsonObj) {
        if (jsonObj.url === "/test/") {
          t.deepEqual(jsonObj, {
            url: "/test/",
            inputPath: "./test/stubs--to/test.md",
            content: "<h1>hi</h1>\n",
          });
        }
        if (jsonObj.url === "/test2/") {
          t.deepEqual(jsonObj, {
            url: "/test2/",
            inputPath: "./test/stubs--to/test2.liquid",
            content: "hello",
          });
        }

        results.push(jsonObj);

        if (results.length >= 2) {
          t.end();
        }
      });
    });
  });
});
