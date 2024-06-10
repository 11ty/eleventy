import test from "ava";
import fastglob from "fast-glob";

import EleventyFiles from "../src/EleventyFiles.js";
import TemplateConfig from "../src/TemplateConfig.js";
import FileSystemSearch from "../src/FileSystemSearch.js";
import TemplatePassthroughManager from "../src/TemplatePassthroughManager.js";
import ProjectDirectories from "../src/Util/ProjectDirectories.js";

import { getTemplateConfigInstance, getTemplateConfigInstanceCustomCallback } from "./_testHelpers.js";

test("Dirs paths", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "src",
      includes: "includes",
      data: "data",
      output: "dist",
    }
  });

  let evf = new EleventyFiles([], eleventyConfig);

  t.deepEqual(evf.inputDir, "./src/");
  t.deepEqual(evf.includesDir, "./src/includes/");
  t.deepEqual(evf.getDataDir(), "./src/data/");
  t.deepEqual(evf.outputDir, "./dist/");
});

test("Dirs paths (relative)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "src",
      includes: "../includes",
      data: "../data",
      output: "dist",
    },
  });

  let evf = new EleventyFiles([], eleventyConfig);

  t.deepEqual(evf.inputDir, "./src/");
  t.deepEqual(evf.includesDir, "./includes/");
  t.deepEqual(evf.getDataDir(), "./data/");
  t.deepEqual(evf.outputDir, "./dist/");
});

test("getFiles", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs/writeTest",
    }
  });

  let evf = new EleventyFiles(["liquid", "md"], eleventyConfig);
  evf.setFileSystemSearch(new FileSystemSearch());
  evf.init();

  t.deepEqual(await evf.getFiles(), ["./test/stubs/writeTest/test.md"]);
});

test("getFiles (without 11ty.js)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs/writeTestJS"
    }
  });

  let evf = new EleventyFiles(["liquid", "md"], eleventyConfig);
  evf.setFileSystemSearch(new FileSystemSearch());
  evf.init();

  t.deepEqual(await evf.getFiles(), []);
});

test("getFiles (with 11ty.js)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs/writeTestJS",
    }
  });

  let evf = new EleventyFiles(["liquid", "md", "11ty.js"], eleventyConfig);
  evf.setFileSystemSearch(new FileSystemSearch());
  evf.init();

  t.deepEqual(await evf.getFiles(), ["./test/stubs/writeTestJS/test.11ty.cjs"]);
});

test("getFiles (with js, treated as passthrough copy)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs/writeTestJS-passthrough",
    }
  });

  let evf = new EleventyFiles(["liquid", "md", "js", "11ty.js"], eleventyConfig);
  evf.setFileSystemSearch(new FileSystemSearch());
  evf.init();

  const files = await evf.getFiles();
  t.deepEqual(
    files.sort(),
    [
      "./test/stubs/writeTestJS-passthrough/sample.js",
      "./test/stubs/writeTestJS-passthrough/test.11ty.js",
    ].sort()
  );

  t.false(evf.extensionMap.hasEngine("./test/stubs/writeTestJS-passthrough/sample.js"));
  t.true(evf.extensionMap.hasEngine("./test/stubs/writeTestJS-passthrough/test.11ty.js"));
});

test("getFiles (with case insensitivity)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs/writeTestJS-casesensitive",
    }
  });

  let evf = new EleventyFiles(["11ty.js", "JS"], eleventyConfig);
  evf.setFileSystemSearch(new FileSystemSearch());
  evf.init();

  t.deepEqual(
    (await evf.getFiles()).sort(),
    [
      "./test/stubs/writeTestJS-casesensitive/sample.Js",
      "./test/stubs/writeTestJS-casesensitive/test.11Ty.js",
    ].sort()
  );
  t.false(evf.extensionMap.hasEngine("./test/stubs/writeTestJS-casesensitive/sample.Js"));
  t.true(evf.extensionMap.hasEngine("./test/stubs/writeTestJS-casesensitive/test.11Ty.js"));
});

test("Mutually exclusive Input and Output dirs", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs/writeTest",
    }
  });

  let evf = new EleventyFiles(["liquid", "md"], eleventyConfig);
  evf.init();

  let files = await fastglob(evf.getFileGlobs());
  t.deepEqual(evf.getRawFiles(), ["./test/stubs/writeTest/**/*.{liquid,md}"]);
  t.true(files.length > 0);
  t.is(files[0], "./test/stubs/writeTest/test.md");
});

test("Single File Input (deep path)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs/index.html",
    }
  });

  let evf = new EleventyFiles(["liquid", "md"], eleventyConfig);
  evf.init();

  let files = await fastglob(evf.getFileGlobs());
  t.is(evf.getRawFiles().length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./test/stubs/index.html");
});

test("Single File Input (shallow path)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "README.md",
    }
  });

  let evf = new EleventyFiles(["md"], eleventyConfig);
  evf.init();

  let globs = evf.getFileGlobs(); //.filter((path) => path !== "./README.md");
  let files = await fastglob(globs, {
    ignore: evf.getIgnoreGlobs(),
  });
  t.is(evf.getRawFiles().length, 1);
  t.is(files.length, 1);
  t.is(files[0], "./README.md");
});

test("Glob Input", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "./test/stubs/glob-pages/!(contact.md)",
    }
  });
  let evf = new EleventyFiles(["md"], eleventyConfig);
  evf.init();

  let globs = evf.getFileGlobs();
  let files = await fastglob(globs);

  t.is(files.length, 2);
  t.is(files[0], "./test/stubs/glob-pages/about.md");
  t.is(files[1], "./test/stubs/glob-pages/home.md");
});

test(".eleventyignore parsing", (t) => {
  let ignores = EleventyFiles.getFileIgnores("./test/stubs/.eleventyignore");
  t.is(ignores.length, 2);
  t.is(ignores[0], "./test/stubs/ignoredFolder/**");
  t.is(ignores[1], "./test/stubs/ignoredFolder/ignored.md");
});

test("Parse multiple .eleventyignores", (t) => {
  let ignores = EleventyFiles.getFileIgnores([
    "./test/stubs/multiple-ignores/.eleventyignore",
    "./test/stubs/multiple-ignores/subfolder/.eleventyignore",
  ]);
  t.is(ignores.length, 4);
  // Note these folders must exist!
  t.is(ignores[0], "./test/stubs/multiple-ignores/ignoredFolder/**");
  t.is(ignores[1], "./test/stubs/multiple-ignores/ignoredFolder/ignored.md");
  t.is(ignores[2], "./test/stubs/multiple-ignores/subfolder/ignoredFolder2/**");
  t.is(ignores[3], "./test/stubs/multiple-ignores/subfolder/ignoredFolder2/ignored2.md");
});

test("Passed file name does not exist", (t) => {
  let ignores = EleventyFiles.getFileIgnores(".thisfiledoesnotexist");
  t.deepEqual(ignores, []);
});

test(".eleventyignore files", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });
  let evf = new EleventyFiles(["liquid", "md"], eleventyConfig);
  evf.init();
  let ignoredFiles = await fastglob("test/stubs/ignoredFolder/*.md");
  t.is(ignoredFiles.length, 1);

  let files = await fastglob(evf.getFileGlobs(), {
    ignore: evf.getIgnoreGlobs(),
  });

  t.true(files.length > 0);

  t.is(
    files.filter((file) => {
      return file.indexOf("./test/stubs/ignoredFolder") > -1;
    }).length,
    0
  );
});

test("getTemplateData caching", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let evf = new EleventyFiles([], eleventyConfig);
  evf.init();
  let templateDataFirstCall = evf.templateData;
  let templateDataSecondCall = evf.templateData;
  t.is(templateDataFirstCall, templateDataSecondCall);
});

test("getDataDir", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "."
    }
  });

  let evf = new EleventyFiles([], eleventyConfig);
  evf.init();
  t.is(evf.getDataDir(), "./_data/");
});

test("getDataDir subdir", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  let evf = new EleventyFiles([], eleventyConfig);
  evf.init();
  t.is(evf.getDataDir(), "./test/stubs/_data/");
});

test("Include and Data Dirs", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });
  let evf = new EleventyFiles([], eleventyConfig);
  evf.init();

  t.deepEqual(evf._getIncludesAndDataDirs(), [
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);
});

test("Input to 'src' and empty includes dir (issue #403)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "src"
    }
  });
  let evf = new EleventyFiles(["md", "liquid", "html"], eleventyConfig);
  evf.setEleventyIgnoreContent("!./src/_includes/**");
  evf._setConfig({
    useGitIgnore: false,
    dir: {
      input: ".",
      output: "_site",
      includes: "",
      data: "_data",
    },
  });
  evf.init();

  t.deepEqual(evf.getFileGlobs(), [
    "./src/**/*.{md,liquid,html}",
    // "!./src/_includes/**",
    // "!./src/_site/**",
    // "!./src/_data/**",
  ]);
});

test("Glob Watcher Files", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });
  let evf = new EleventyFiles(["njk"], eleventyConfig);
  evf.init();

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);
});

test("Glob Watcher Files with File Extension Passthroughs", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });
  let evf = new EleventyFiles(["njk", "png"], eleventyConfig);
  evf.init();

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/**/*.png",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);
});

test("Glob Watcher Files with File Extension Passthroughs with Dev Server (for free passthrough copy #2456)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
    dir: {
      input: "test/stubs"
    }
  });

  eleventyConfig.userConfig.setServerPassthroughCopyBehavior("passthrough");
  eleventyConfig.config.serverPassthroughCopyBehavior = "passthrough";

  let evf = new EleventyFiles(["njk", "png"], eleventyConfig);
  evf.setRunMode("serve");
  evf.init();

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);

  t.deepEqual(evf.getGlobWatcherFilesForPassthroughCopy(), ["./test/stubs/**/*.png"]);
});

test("Glob Watcher Files with Config Passthroughs (one template format)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs",
    output: "test/stubs/_site"
  }, function(cfg) {
		cfg.passthroughCopies = {
			"test/stubs/img/": { outputPath: true },
		};
	});


  let evf = new EleventyFiles(["njk"], eleventyConfig);
  evf.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  evf.setPassthroughManager(mgr);

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/img/**",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);
});

test("Glob Watcher Files with Config Passthroughs (one template format) with Dev Server (for free passthrough copy #2456)", async (t) => {
  let eleventyConfig = await getTemplateConfigInstanceCustomCallback({
    input: "test/stubs"
  }, function(cfg) {
		cfg.setServerPassthroughCopyBehavior("passthrough");

		cfg.passthroughCopies = {
			"test/stubs/img/": { outputPath: true },
		};
	});

  let evf = new EleventyFiles(["njk"], eleventyConfig);
  evf.setRunMode("serve");
  evf.init();

  let mgr = new TemplatePassthroughManager(eleventyConfig);
  evf.setPassthroughManager(mgr);

  t.deepEqual(evf.getGlobWatcherFiles(), [
    "./test/stubs/**/*.njk",
    "./test/stubs/_includes/**",
    "./test/stubs/_data/**",
  ]);

  t.deepEqual(evf.getGlobWatcherFilesForPassthroughCopy(), ["./test/stubs/img/**"]);
});

test("Glob Watcher Files with Config Passthroughs (no template formats)", async (t) => {
  let templateConfig = new TemplateConfig();
  let projectDirs = new ProjectDirectories();
  projectDirs.setViaConfigObject({
    input: "test/stubs"
  });
  let eleventyConfig = await getTemplateConfigInstance(templateConfig, projectDirs);

  let evf = new EleventyFiles([], eleventyConfig);
  evf.init();

  t.deepEqual(await evf.getGlobWatcherTemplateDataFiles(), [
    "./test/stubs/**/*.{json,11tydata.mjs,11tydata.cjs,11tydata.js}",
  ]);
});

test("Test that negations are ignored (for now) PR#709, will change when #693 is implemented", async (t) => {
  t.deepEqual(
    EleventyFiles.normalizeIgnoreContent(
      "./",
      `hello
!testing`
    ),
    ["./hello"]
  );
});
