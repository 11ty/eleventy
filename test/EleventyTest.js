const test = require("ava");
const Eleventy = require("../src/Eleventy");
const EleventyWatchTargets = require("../src/EleventyWatchTargets");
const TemplateConfig = require("../src/TemplateConfig");
const DateGitLastUpdated = require("../src/Util/DateGitLastUpdated");

test("Eleventy, defaults inherit from config", async (t) => {
  let elev = new Eleventy();

  let config = new TemplateConfig().getConfig();

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

test("Eleventy process.ENV", async (t) => {
  delete process.env.ELEVENTY_ROOT;
  t.falsy(process.env.ELEVENTY_ROOT);

  let elev = new Eleventy("./test/stubs", "./test/stubs/_site");
  await elev.init();
  t.truthy(process.env.ELEVENTY_ROOT);

  // all ELEVENTY_ env variables are also available on eleventy.env
  let globals = await elev.templateData.getInitialGlobalData();
  t.truthy(globals.eleventy.env.root);
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
  elev.disableLogger();
  // await elev.init(); // no longer necessary
  await elev.write();

  t.is(process.exitCode, 1);

  process.exitCode = previousExitCode;
});

test("Eleventy to json", async (t) => {
  let elev = new Eleventy("./test/stubs--to/");
  elev.setIsVerbose(false);

  // await elev.init(); // no longer necessary

  let result = await elev.toJSON();

  t.deepEqual(
    result.filter((entry) => entry.url === "/test/"),
    [
      {
        url: "/test/",
        inputPath: "./test/stubs--to/test.md",
        outputPath: "_site/test/index.html",
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
        outputPath: "_site/test2/index.html",
        content: "hello",
      },
    ]
  );
});

test("Eleventy to ndjson", async (t) => {
  let elev = new Eleventy("./test/stubs--to/");

  elev.setIsVerbose(false);

  // await elev.init(); // no longer necessary

  let stream = await elev.toNDJSON();
  let count = 0;
  await new Promise((resolve) => {
    stream.on("data", function (buf) {
      count++;
      let jsonObj = JSON.parse(buf.toString());
      if (jsonObj.url === "/test/") {
        t.deepEqual(jsonObj, {
          url: "/test/",
          inputPath: "./test/stubs--to/test.md",
          outputPath: "_site/test/index.html",
          content: "<h1>hi</h1>\n",
        });
      }
      if (jsonObj.url === "/test2/") {
        t.deepEqual(jsonObj, {
          url: "/test2/",
          inputPath: "./test/stubs--to/test2.liquid",
          outputPath: "_site/test2/index.html",
          content: "hello",
        });
      }

      if (count >= 2) {
        resolve();
      }
    });
  });
});

test("Eleventy to ndjson (returns a stream)", async (t) => {
  let elev = new Eleventy("./test/stubs--to/");

  elev.setIsVerbose(false);

  let stream = await elev.toNDJSON();

  await new Promise((resolve) => {
    let results = [];
    stream.on("data", function (entry) {
      let jsonObj = JSON.parse(entry);
      if (jsonObj.url === "/test/") {
        t.deepEqual(jsonObj, {
          url: "/test/",
          inputPath: "./test/stubs--to/test.md",
          outputPath: "_site/test/index.html",
          content: "<h1>hi</h1>\n",
        });
      }
      if (jsonObj.url === "/test2/") {
        t.deepEqual(jsonObj, {
          url: "/test2/",
          inputPath: "./test/stubs--to/test2.liquid",
          outputPath: "_site/test2/index.html",
          content: "hello",
        });
      }

      results.push(jsonObj);

      if (results.length >= 2) {
        resolve();
      }
    });
  });
});

test("Two Eleventies, two configs!!! (config used to be a global)", async (t) => {
  let elev1 = new Eleventy();

  t.is(elev1.eleventyConfig, elev1.eleventyConfig);
  t.is(elev1.config, elev1.config);
  t.is(JSON.stringify(elev1.config), JSON.stringify(elev1.config));

  let elev2 = new Eleventy();
  t.not(elev1.eleventyConfig, elev2.eleventyConfig);
  elev1.config.benchmarkManager = null;
  elev2.config.benchmarkManager = null;
  t.is(JSON.stringify(elev1.config), JSON.stringify(elev2.config));
});

test("Config propagates to other instances correctly", async (t) => {
  let elev = new Eleventy();
  await elev.init();

  t.is(elev.eleventyServe.config, elev.config);

  t.is(elev.extensionMap.eleventyConfig, elev.eleventyConfig);
  t.is(elev.eleventyFiles.eleventyConfig, elev.eleventyConfig);
  t.is(elev.templateData.eleventyConfig, elev.eleventyConfig);
  t.is(elev.writer.eleventyConfig, elev.eleventyConfig);
});

test("Eleventy programmatic API without init", async (t) => {
  let elev = new Eleventy("./test/stubs--to/");
  elev.setIsVerbose(false);

  let result = await elev.toJSON();

  t.deepEqual(
    result.filter((entry) => entry.url === "/test/"),
    [
      {
        url: "/test/",
        inputPath: "./test/stubs--to/test.md",
        outputPath: "_site/test/index.html",
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
        outputPath: "_site/test2/index.html",
        content: "hello",
      },
    ]
  );
});

test("Can Eleventy run two executeBuilds in parallel?", async (t) => {
  let elev = new Eleventy("./test/stubs--to/");
  elev.setIsVerbose(false);

  let p1 = elev.toJSON();
  let p2 = elev.toJSON();
  let [result1, result2] = await Promise.all([p1, p2]);

  let test1Result = [
    {
      url: "/test/",
      inputPath: "./test/stubs--to/test.md",
      outputPath: "_site/test/index.html",
      content: "<h1>hi</h1>\n",
    },
  ];

  let test2Result = [
    {
      url: "/test2/",
      inputPath: "./test/stubs--to/test2.liquid",
      outputPath: "_site/test2/index.html",
      content: "hello",
    },
  ];

  t.deepEqual(
    result1.filter((entry) => entry.url === "/test/"),
    test1Result
  );
  t.deepEqual(
    result1.filter((entry) => entry.url === "/test2/"),
    test2Result
  );

  t.deepEqual(
    result2.filter((entry) => entry.url === "/test/"),
    test1Result
  );
  t.deepEqual(
    result2.filter((entry) => entry.url === "/test2/"),
    test2Result
  );
});

test("Eleventy addGlobalData should run once", async (t) => {
  let count = 0;
  let elev = new Eleventy("./test/stubs-noop/", "./test/stubs-noop/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addGlobalData("count", () => {
        count++;
        return count;
      });
    },
  });

  let results = await elev.toJSON();
  t.is(count, 1);
});

test("Eleventy addGlobalData can feed layouts to populate data cascade with layout data, issue #1245", async (t) => {
  let count = 0;
  let elev = new Eleventy("./test/stubs-2145/", "./test/stubs-2145/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addGlobalData("layout", () => "layout.njk");
      eleventyConfig.dataFilterSelectors.add("LayoutData");
    },
  });

  let [result] = await elev.toJSON();
  t.deepEqual(result.data, { LayoutData: 123 });
  t.is(result.content.trim(), "FromLayoutlayout.njk");
});

test("Unicode in front matter `tags`, issue #670", async (t) => {
  let elev = new Eleventy("./test/stubs-670/", "./test/stubs-670/_site");

  let results = await elev.toJSON();
  results.sort((a, b) => {
    if (a.inputPath > b.inputPath) {
      return -1;
    }
    return 1;
  });

  t.is(results[0].content.trim(), "2,all,Cañon City,");
});

test("#142: date 'git Last Modified' populates page.date", async (t) => {
  let elev = new Eleventy("./test/stubs-142/", "./test/stubs-142/_site");

  let results = await elev.toJSON();
  let [result] = results;

  // This doesn’t test the validity of the function, only that it populates page.date.
  let comparisonDate = DateGitLastUpdated("./test/stubs-142/index.njk");
  t.is(result.content.trim(), "" + comparisonDate.getTime());
});
