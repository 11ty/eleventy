import test from "ava";

import { TransformPlugin } from "../src/Plugins/InputPathToUrl.js";
import { default as HtmlBasePlugin } from "../src/Plugins/HtmlBasePlugin.js";
import Eleventy from "../src/Eleventy.js";
import { normalizeNewLines } from "./Util/normalizeNewLines.js";

const OUTPUT_HTML_STD = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<link rel="stylesheet" href="/output.css">
<script src="/output.css"></script>
</head>
<body>
<a href="/">Home</a>
<a href="/tmpl/">Test</a>
<a href="/tmpl/#anchor">Anchor</a>
<a href="#anchor">Anchor</a>
<a href="./#anchor">Anchor</a>
<a href="?search=1">Search</a>
<a href="./?search=1">Search</a>
</body>
</html>`;

const OUTPUT_HTML_BASE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<link rel="stylesheet" href="/gh-pages/output.css">
<script src="/gh-pages/output.css"></script>
</head>
<body>
<a href="/gh-pages/">Home</a>
<a href="/gh-pages/tmpl/">Test</a>
<a href="/gh-pages/tmpl/#anchor">Anchor</a>
<a href="#anchor">Anchor</a>
<a href="#anchor">Anchor</a>
<a href="?search=1">Search</a>
<a href="?search=1">Search</a>
</body>
</html>`;

function getContentFor(results, filename) {
  let content = results.filter((entry) => entry.outputPath.endsWith(filename))[0].content;
  return normalizeNewLines(content.trim());
}

test("Using the transform (and the filter too)", async (t) => {
  let elev = new Eleventy("./test/stubs-pathtourl/", "./test/stubs-pathtourl/_site", {
    configPath: false,
    config: function (eleventyConfig) {
			// FilterPlugin is available in the default config.
      eleventyConfig.addPlugin(TransformPlugin);
    },
  });

  let results = await elev.toJSON();
	// filter is already available in the default config.
	t.is(
    getContentFor(results, "/filter/index.html"),
    OUTPUT_HTML_STD
  );
  t.is(
    getContentFor(results, "/transform/index.html"),
    OUTPUT_HTML_STD
  );
});

test("Using the filter", async (t) => {
  let elev = new Eleventy("./test/stubs-pathtourl/", "./test/stubs-pathtourl/_site", {
		// FilterPlugin is available in the default config.
    configPath: false,
  });

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/filter/index.html"),
    OUTPUT_HTML_STD
  );
	t.not(
    getContentFor(results, "/transform/index.html"),
    OUTPUT_HTML_STD
  );
});

test("Using the transform and the base plugin", async (t) => {
  let elev = new Eleventy("./test/stubs-pathtourl/", "./test/stubs-pathtourl/_site", {
    configPath: false,
		pathPrefix: "/gh-pages/",
    config: function (eleventyConfig) {
			eleventyConfig.addPlugin(TransformPlugin);
      eleventyConfig.addPlugin(HtmlBasePlugin);
    },
  });

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/filter/index.html"),
    OUTPUT_HTML_BASE
  );
	t.is(
    getContentFor(results, "/transform/index.html"),
    OUTPUT_HTML_BASE
  );
});

test("Using the transform and the base plugin, reverse order", async (t) => {
  let elev = new Eleventy("./test/stubs-pathtourl/", "./test/stubs-pathtourl/_site", {
    configPath: false,
		pathPrefix: "/gh-pages/",
    config: function (eleventyConfig) {
			eleventyConfig.addPlugin(HtmlBasePlugin);
			eleventyConfig.addPlugin(TransformPlugin);
    },
  });

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/filter/index.html"),
    OUTPUT_HTML_BASE
  );
	t.is(
    getContentFor(results, "/transform/index.html"),
    OUTPUT_HTML_BASE
  );
});


test("Issue #3417 Using the transform with relative path (dot slash)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    configPath: false,
    config: function (eleventyConfig) {
			// FilterPlugin is available in the default config.
      eleventyConfig.addPlugin(TransformPlugin);

      eleventyConfig.addTemplate("source/test.njk", `<a href="./target.njk">Target</a>`)
      eleventyConfig.addTemplate("source/target.njk", "lol")
    },
  });

  let results = await elev.toJSON();
	// filter is already available in the default config.
	t.is(
    getContentFor(results, "/source/test/index.html"),
    `<a href="/source/target/">Target</a>`
  );
});

test("Issue #3417 Using the transform with relative path (no dot slash)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    configPath: false,
    config: function (eleventyConfig) {
			// FilterPlugin is available in the default config.
      eleventyConfig.addPlugin(TransformPlugin);

      eleventyConfig.addTemplate("source/test.njk", `<a href="target.njk">Target</a>`)
      eleventyConfig.addTemplate("source/target.njk", "lol")
    },
  });

  let results = await elev.toJSON();
	// filter is already available in the default config.
	t.is(
    getContentFor(results, "/source/test/index.html"),
    `<a href="/source/target/">Target</a>`
  );
});
