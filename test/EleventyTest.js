import test from "ava";
import Eleventy from "../src/Eleventy.js";
import EleventyWatchTargets from "../src/EleventyWatchTargets.js";
import TemplateConfig from "../src/TemplateConfig.js";
import DateGitFirstAdded from "../src/Util/DateGitFirstAdded.js";
import DateGitLastUpdated from "../src/Util/DateGitLastUpdated.js";
import normalizeNewLines from "./Util/normalizeNewLines.js";

test("Eleventy, defaults inherit from config", async (t) => {
  let elev = await Eleventy.from();

  let config = new TemplateConfig().getConfig();

  t.truthy(elev.input);
  t.truthy(elev.outputDir);
  t.is(elev.input, config.dir.input);
  t.is(elev.outputDir, config.dir.output);
});

test("Eleventy, get version", async (t) => {
  let elev = await Eleventy.from();

  t.truthy(elev.getVersion());
});

test("Eleventy, get help", async (t) => {
  let elev = await Eleventy.from();

  t.truthy(elev.getHelp());
});

test("Eleventy, set is verbose", async (t) => {
  let elev = await Eleventy.from();
  elev.setIsVerbose(true);

  t.true(elev.verboseMode);
});

test("Eleventy set input/output", async (t) => {
  let elev = await Eleventy.from("./test/stubs", "./test/stubs/_site");

  t.is(elev.input, "./test/stubs");
  t.is(elev.outputDir, "./test/stubs/_site");

  await elev.init();
  t.truthy(elev.templateData);
  t.truthy(elev.writer);
});

test("Eleventy process.ENV", async (t) => {
  delete process.env.ELEVENTY_ROOT;
  t.falsy(process.env.ELEVENTY_ROOT);

  let elev = await Eleventy.from("./test/stubs", "./test/stubs/_site");
  await elev.init();
  t.truthy(process.env.ELEVENTY_ROOT);

  // all ELEVENTY_ env variables are also available on eleventy.env
  let globals = await elev.templateData.getInitialGlobalData();
  t.truthy(globals.eleventy.env.root);
});

test("Eleventy file watching", async (t) => {
  let elev = await Eleventy.from("./test/stubs", "./test/stubs/_site");
  elev.setFormats("njk");

  await elev.init();
  await elev.eleventyFiles.getFiles();
  await elev.initWatch();
  t.deepEqual(await elev.getWatchedFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
    "./.eleventy.js",
    "./eleventy.config.js",
    "./eleventy.config.cjs",
    "./test/stubs/**/*.json",
    "./test/stubs/**/*.11tydata.cjs",
    "./test/stubs/**/*.11tydata.js",
    "./test/stubs/deps/dep1.js",
    "./test/stubs/deps/dep2.js",
  ]);
});

test("Eleventy file watching (don’t watch deps of passthrough copy .js files)", async (t) => {
  let elev = await Eleventy.from(
    "./test/stubs-1325",
    "./test/stubs-1325/_site"
  );
  elev.setFormats("11ty.js,js");

  await elev.init();
  await elev.eleventyFiles.getFiles();
  await elev.initWatch();

  t.deepEqual(await elev.eleventyFiles.getWatchPathCache(), [
    "./test/stubs-1325/test.11ty.js",
  ]);
});

test("Eleventy file watching (no JS dependencies)", async (t) => {
  let elev = await Eleventy.from("./test/stubs", "./test/stubs/_site");
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
    "./eleventy.config.js",
    "./eleventy.config.cjs",
    "./test/stubs/**/*.json",
    "./test/stubs/**/*.11tydata.cjs",
    "./test/stubs/**/*.11tydata.js",
  ]);
});

test("Eleventy set input/output, one file input", async (t) => {
  let elev = await Eleventy.from(
    "./test/stubs/index.html",
    "./test/stubs/_site"
  );

  t.is(elev.input, "./test/stubs/index.html");
  t.is(elev.inputDir, "./test/stubs");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input, deeper subdirectory", async (t) => {
  let elev = await Eleventy.from(
    "./test/stubs/subdir/index.html",
    "./test/stubs/_site"
  );
  elev.setInputDir("./test/stubs");

  t.is(elev.input, "./test/stubs/subdir/index.html");
  t.is(elev.inputDir, "./test/stubs");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input root dir", async (t) => {
  let elev = await Eleventy.from("./README.md", "./test/stubs/_site");

  t.is(elev.input, "./README.md");
  t.is(elev.inputDir, ".");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input root dir without leading dot/slash", async (t) => {
  let elev = await Eleventy.from("README.md", "./test/stubs/_site");

  t.is(elev.input, "README.md");
  t.is(elev.inputDir, ".");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input exitCode (script)", async (t) => {
  let previousExitCode = process.exitCode;
  let elev = await Eleventy.from(
    "./test/stubs/exitCode/failure.njk",
    "./test/stubs/exitCode/_site",
    {
      source: "script",
    }
  );
  elev.setIsVerbose(false);
  elev.disableLogger();

  await t.throwsAsync(async () => {
    await elev.write();
  });

  // no change to the exit code when running script
  t.is(process.exitCode, previousExitCode);
});

test("Eleventy set input/output, one file input exitCode (cli)", async (t) => {
  let previousExitCode = process.exitCode;
  let elev = await Eleventy.from(
    "./test/stubs/exitCode/failure.njk",
    "./test/stubs/exitCode/_site",
    {
      source: "cli",
    }
  );
  elev.setIsVerbose(false);
  elev.disableLogger();

  await elev.write();

  t.is(process.exitCode, 1);

  process.exitCode = previousExitCode;
});

test("Eleventy to json", async (t) => {
  let elev = await Eleventy.from("./test/stubs--to/");
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

test("Eleventy to ndjson", async (t) => {
  let elev = await Eleventy.from("./test/stubs--to/");

  elev.setIsVerbose(false);

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
  let elev = await Eleventy.from("./test/stubs--to/");

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
  let elev1 = await Eleventy.from();

  t.is(elev1.eleventyConfig, elev1.eleventyConfig);
  t.is(elev1.config, elev1.config);
  t.is(JSON.stringify(elev1.config), JSON.stringify(elev1.config));

  let elev2 = await Eleventy.from();
  t.not(elev1.eleventyConfig, elev2.eleventyConfig);
  elev1.config.benchmarkManager = null;
  elev2.config.benchmarkManager = null;
  t.is(JSON.stringify(elev1.config), JSON.stringify(elev2.config));
});

test("Config propagates to other instances correctly", async (t) => {
  let elev = await Eleventy.from();
  await elev.init();

  t.is(elev.eleventyServe.config, elev.config);

  t.is(elev.extensionMap.eleventyConfig, elev.eleventyConfig);
  t.is(elev.eleventyFiles.eleventyConfig, elev.eleventyConfig);
  t.is(elev.templateData.eleventyConfig, elev.eleventyConfig);
  t.is(elev.writer.eleventyConfig, elev.eleventyConfig);
});

test("Eleventy programmatic API without init", async (t) => {
  let elev = await Eleventy.from("./test/stubs--to/");
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
  let elev = await Eleventy.from("./test/stubs--to/");
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
  let elev = await Eleventy.from(
    "./test/stubs-noop/",
    "./test/stubs-noop/_site",
    {
      config: function (eleventyConfig) {
        eleventyConfig.addGlobalData("count", () => {
          count++;
          return count;
        });
      },
    }
  );

  let results = await elev.toJSON();
  t.is(count, 1);
});

test("Eleventy addGlobalData can feed layouts to populate data cascade with layout data, issue #1245", async (t) => {
  let elev = await Eleventy.from(
    "./test/stubs-2145/",
    "./test/stubs-2145/_site",
    {
      config: function (eleventyConfig) {
        eleventyConfig.addGlobalData("layout", () => "layout.njk");
        eleventyConfig.dataFilterSelectors.add("LayoutData");
      },
    }
  );

  let [result] = await elev.toJSON();
  t.deepEqual(result.data, { LayoutData: 123 });
  t.is(result.content.trim(), "FromLayoutlayout.njk");
});

test("Unicode in front matter `tags`, issue #670", async (t) => {
  let elev = await Eleventy.from("./test/stubs-670/", "./test/stubs-670/_site");

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
  let elev = await Eleventy.from("./test/stubs-142/", "./test/stubs-142/_site");

  let results = await elev.toJSON();
  let [result] = results;

  // This doesn’t test the validity of the function, only that it populates page.date.
  let comparisonDate = DateGitLastUpdated("./test/stubs-142/index.njk");
  t.is(result.content.trim(), "" + comparisonDate.getTime());
});

test("DateGitLastUpdated returns undefined on nonexistent path", (t) => {
  t.is(DateGitLastUpdated("./test/invalid.invalid"), undefined);
});

/* This test writes to the console */
test("#2167: Pagination with permalink: false", async (t) => {
  let elev = await Eleventy.from(
    "./test/stubs-2167/",
    "./test/stubs-2167/_site"
  );
  elev.setDryRun(true);

  let [passthroughCopy, pages] = await elev.write();

  t.is(pages.length, 5);

  for (let j = 0, k = pages.length; j < k; j++) {
    // falsy if not writeable or is not renderable
    t.is(pages[j], undefined);
  }
});

test("Pagination over collection using eleventyComputed (liquid)", async (t) => {
  t.plan(5);
  let elev = await Eleventy.from(
    "./test/stubs-pagination-computed-quotes/",
    "./test/stubs-pagination-computed-quotes/_site",
    {
      config: function (eleventyConfig) {
        eleventyConfig.addFilter("selectRandomFromArray", (arr) => {
          t.true(Array.isArray(arr));
          t.deepEqual(arr, ["The person that shared this is awesome"]);
          return arr[0];
        });
      },
    }
  );

  let results = await elev.toJSON();
  t.is(results.length, 2);
  let content = results.map((entry) => entry.content).sort();
  t.is(content[0], "No");
  t.is(content[1], "The person that shared this is awesome");
});

test("Pagination over collection using eleventyComputed (njk)", async (t) => {
  t.plan(5);
  let elev = await Eleventy.from(
    "./test/stubs-pagination-computed-quotes-njk/",
    "./test/stubs-pagination-computed-quotes-njk/_site",
    {
      config: function (eleventyConfig) {
        eleventyConfig.addFilter("selectRandomFromArray", (arr) => {
          t.true(Array.isArray(arr));
          t.deepEqual(arr, ["The person that shared this is awesome"]);
          return arr[0];
        });
      },
    }
  );

  let results = await elev.toJSON();
  t.is(results.length, 2);
  let content = results.map((entry) => entry.content).sort();
  t.is(content[0], "No");
  t.is(content[1], "The person that shared this is awesome");
});

test("Paginated template uses proxy and global data", async (t) => {
  let elev = await Eleventy.from(
    "./test/proxy-pagination-globaldata/",
    "./test/proxy-pagination-globaldata/_site",
    {
      config: function (eleventyConfig) {},
    }
  );

  let results = await elev.toJSON();
  let allContentMatches = results.filter((entry) => {
    return entry.content.trim() === "BANNER TEXT";
  });
  t.is(results.length, allContentMatches.length);
});

test("Liquid shortcode with multiple arguments(issue #2348)", async (t) => {
  // NOTE issue #2348 was only active when you were processing multiple templates at the same time.

  let elev = await Eleventy.from(
    "./test/stubs-2367/",
    "./test/stubs-2367/_site",
    {
      config: function (eleventyConfig) {
        eleventyConfig.addShortcode("simplelink", function (...args) {
          return JSON.stringify(args);
        });
      },
    }
  );

  let arr = [
    "layout",
    "/mylayout",
    "layout",
    "/mylayout",
    "layout",
    "/mylayout",
  ];
  let str = normalizeNewLines(`${JSON.stringify(arr)}
${JSON.stringify(arr)}`);
  let results = await elev.toJSON();
  t.is(results.length, 2);
  let content = results.map((entry) => entry.content).sort();
  t.is(normalizeNewLines(content[0]), str);
  t.is(normalizeNewLines(content[1]), str);
});

test("#2224: date 'git created' populates page.date", async (t) => {
  let elev = await Eleventy.from(
    "./test/stubs-2224/",
    "./test/stubs-2224/_site"
  );

  let results = await elev.toJSON();
  let [result] = results;

  // This doesn’t test the validity of the function, only that it populates page.date.
  let comparisonDate = DateGitFirstAdded("./test/stubs-2224/index.njk");
  t.is(result.content.trim(), "" + comparisonDate.getTime());
});

test("DateGitFirstAdded returns undefined on nonexistent path", async (t) => {
  t.is(DateGitFirstAdded("./test/invalid.invalid"), undefined);
});

test.only("Does pathPrefix affect page URLs", async (t) => {
  let elev = await Eleventy.from("./README.md", "./_site", {
    config: function (eleventyConfig) {
      return {
        pathPrefix: "/testdirectory/",
      };
    },
  });

  let results = await elev.toJSON();
  let [result] = results;
  t.is(result.url, "/README/");
});
