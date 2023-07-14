const test = require("ava");
const fsp = require("fs").promises;
const eventBus = require("../src/EventBus.js");
const Eleventy = require("../src/Eleventy");
const TemplateContent = require("../src/TemplateContent");
const EleventyWatchTargets = require("../src/EleventyWatchTargets");
const TemplateMap = require("../src/TemplateMap");
const TemplateConfig = require("../src/TemplateConfig");
const DateGitFirstAdded = require("../src/Util/DateGitFirstAdded.js");
const DateGitLastUpdated = require("../src/Util/DateGitLastUpdated");
const normalizeNewLines = require("./Util/normalizeNewLines");

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
  let globalData = await elev.templateData.getGlobalData();

  await elev.eleventyFiles.getFiles();
  await elev.initWatch();

  t.deepEqual(await elev.getWatchedFiles(), [
    "./package.json",
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
    "./.gitignore",
    "./.eleventyignore",
    "./test/stubs/.eleventyignore",
    "./.eleventy.js",
    "./eleventy.config.js",
    "./eleventy.config.cjs",
    "./test/stubs/**/*.{json,11tydata.cjs,11tydata.js}",
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

  t.deepEqual(await elev.eleventyFiles.getWatchPathCache(), ["./test/stubs-1325/test.11ty.js"]);
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
    "./package.json",
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
    "./.gitignore",
    "./.eleventyignore",
    "./test/stubs/.eleventyignore",
    "./.eleventy.js",
    "./eleventy.config.js",
    "./eleventy.config.cjs",
    "./test/stubs/**/*.{json,11tydata.cjs,11tydata.js}",
  ]);
});

test("Eleventy set input/output, one file input", async (t) => {
  let elev = new Eleventy("./test/stubs/index.html", "./test/stubs/_site");

  t.is(elev.input, "./test/stubs/index.html");
  t.is(elev.inputDir, "./test/stubs");
  t.is(elev.outputDir, "./test/stubs/_site");
});

test("Eleventy set input/output, one file input, deeper subdirectory", async (t) => {
  let elev = new Eleventy("./test/stubs/subdir/index.html", "./test/stubs/_site");
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

test("Eleventy set input/output, one file input exitCode (script)", async (t) => {
  let previousExitCode = process.exitCode;
  let elev = new Eleventy("./test/stubs/exitCode/failure.njk", "./test/stubs/exitCode/_site", {
    source: "script",
  });
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
  let elev = new Eleventy("./test/stubs/exitCode/failure.njk", "./test/stubs/exitCode/_site", {
    source: "cli",
  });
  elev.setIsVerbose(false);
  elev.disableLogger();

  await elev.write();

  t.is(process.exitCode, 1);

  process.exitCode = previousExitCode;
});

test("Eleventy to json", async (t) => {
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

test("Eleventy to ndjson", async (t) => {
  let elev = new Eleventy("./test/stubs--to/");

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
  delete elev1.config.uses;
  t.is(JSON.stringify(elev1.config), JSON.stringify(elev1.config));

  let elev2 = new Eleventy();
  t.not(elev1.eleventyConfig, elev2.eleventyConfig);
  elev1.config.benchmarkManager = null;
  elev2.config.benchmarkManager = null;
  delete elev2.config.uses;
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
  let elev = new Eleventy("./test/stubs-addglobaldata/", "./test/stubs-addglobaldata/_site", {
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

test("Eleventy addGlobalData shouldn’t run if no input templates match!", async (t) => {
  let count = 0;
  let elev = new Eleventy(
    "./test/stubs-addglobaldata-noop/",
    "./test/stubs-addglobaldata-noop/_site",
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
  t.is(count, 0);
});

test("Eleventy addGlobalData can feed layouts to populate data cascade with layout data, issue #1245", async (t) => {
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

test("DateGitLastUpdated returns undefined on nonexistent path", (t) => {
  t.is(DateGitLastUpdated("./test/invalid.invalid"), undefined);
});

/* This test writes to the console */
test("#2167: Pagination with permalink: false", async (t) => {
  let elev = new Eleventy("./test/stubs-2167/", "./test/stubs-2167/_site");
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
  let elev = new Eleventy(
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
  let elev = new Eleventy(
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
  let elev = new Eleventy(
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

  let elev = new Eleventy("./test/stubs-2367/", "./test/stubs-2367/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addShortcode("simplelink", function (...args) {
        return JSON.stringify(args);
      });
    },
  });

  let arr = ["layout", "/mylayout", "layout", "/mylayout", "layout", "/mylayout"];
  let str = normalizeNewLines(`${JSON.stringify(arr)}
${JSON.stringify(arr)}`);
  let results = await elev.toJSON();
  t.is(results.length, 2);
  let content = results.map((entry) => entry.content).sort();
  t.is(normalizeNewLines(content[0]), str);
  t.is(normalizeNewLines(content[1]), str);
});

test("#2224: date 'git created' populates page.date", async (t) => {
  let elev = new Eleventy("./test/stubs-2224/", "./test/stubs-2224/_site");

  let results = await elev.toJSON();
  let [result] = results;

  // This doesn’t test the validity of the function, only that it populates page.date.
  let comparisonDate = DateGitFirstAdded("./test/stubs-2224/index.njk");
  t.is(result.content.trim(), "" + comparisonDate.getTime());
});

test("DateGitFirstAdded returns undefined on nonexistent path", async (t) => {
  t.is(DateGitFirstAdded("./test/invalid.invalid"), undefined);
});

test("Does pathPrefix affect page URLs", async (t) => {
  let elev = new Eleventy("./README.md", "./_site", {
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

test("Improvements to custom template syntax APIs (includes a layout file) #2258", async (t) => {
  let elev = new Eleventy("./test/stubs-2258/", "./test/stubs-2258/_site", {
    configPath: "./test/stubs-2258/eleventy.config.js",
  });

  // Restore previous contents
  let includeFilePath = "./test/stubs-2258/_includes/_code.scss";
  let previousContents = `code {
  padding: 0.25em;
  line-height: 0;
}`;
  let newContents = `/* New content */`;

  await fsp.writeFile(includeFilePath, previousContents, { encoding: "utf8" });

  let sizes = [TemplateContent._inputCache.size, TemplateContent._compileCache.size];

  let results = await elev.toJSON();

  t.is(results.length, 1);
  t.is(
    normalizeNewLines(results[0].content),
    `/* Banner */
${previousContents}

/* Comment */`
  );

  // Cache sizes are now one bigger
  t.is(sizes[0] + 1, 1);
  t.is(sizes[1] + 1, 1);

  let results2 = await elev.toJSON();
  t.is(
    normalizeNewLines(results2[0].content),
    `/* Banner */
${previousContents}

/* Comment */`
  );

  // Cache sizes are unchanged from last build
  t.is(sizes[0] + 1, 1);
  t.is(sizes[1] + 1, 1);

  await fsp.writeFile(includeFilePath, newContents, { encoding: "utf8" });

  // Trigger that the file has changed
  eventBus.emit("eleventy.resourceModified", includeFilePath);

  elev.setIncrementalFile(includeFilePath);

  let results3 = await elev.toJSON();
  t.is(
    normalizeNewLines(results3[0].content),
    `/* Banner */
${newContents}
/* Comment */`
  );

  await fsp.writeFile(includeFilePath, previousContents, { encoding: "utf8" });
});

const { get: lodashGet } = require("@11ty/lodash-custom");
test("Lodash get (for pagination data target) object key with spaces, issue #2851", (t) => {
  let data = {
    collections: {
      "tag with spaces": 2,
    },
  };
  t.is(2, lodashGet(data, "collections['tag with spaces']"));

  // wow, this works huh?
  t.is(2, lodashGet(data, "collections.tag with spaces"));

  let tm = new TemplateMap(new TemplateConfig());
  t.is(tm.getTagTarget("collections.tag with spaces"), "tag with spaces");
  t.is(tm.getTagTarget("collections['tag with spaces']"), "tag with spaces");
  t.is(tm.getTagTarget('collections["tag with spaces"]'), "tag with spaces");
});

test("Eleventy tag collection with spaces in the tag name, issue #2851", async (t) => {
  let elev = new Eleventy("./test/stubs-2851", "./test/stubs-2851/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.dataFilterSelectors.add("collections");
    },
  });
  elev.setIsVerbose(false);

  let result = await elev.toJSON();
  t.deepEqual(result.length, 2);
  t.deepEqual(result.length, result[0].data.collections.all.length);
  t.deepEqual(result[0].data.collections["tag with spaces"].length, 1);
});

test("this.eleventy on JavaScript template functions, issue #2790", async (t) => {
  t.plan(3);

  let elev = new Eleventy("./test/stubs-2790", "./test/stubs-2790/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addJavaScriptFunction("jsfunction", function () {
        t.truthy(this.eleventy);
        return this.eleventy.generator.split(" ")[0];
      });
    },
  });
  let result = await elev.toJSON();
  t.deepEqual(result.length, 1);
  t.deepEqual(result[0].content, `<p>Eleventy</p>`);
});

test("Global data JS files should only execute once, issue #2753", async (t) => {
  let elev = new Eleventy("./test/stubs-2753", "./test/stubs-2753/_site", {
    config: function (eleventyConfig) {},
  });
  let result = await elev.toJSON();
  t.deepEqual(result.length, 2);
  t.deepEqual(result[0].content, `1`);
  t.deepEqual(result[0].content, `1`);
});
