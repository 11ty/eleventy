const test = require("ava");
const HtmlBasePlugin = require("../src/Plugins/HtmlBasePlugin");
const Eleventy = require("../src/Eleventy");
const normalizeNewLines = require("./Util/normalizeNewLines");

function getContentFor(results, filename) {
  let content = results.filter((entry) =>
    entry.outputPath.endsWith(filename)
  )[0].content;
  return normalizeNewLines(content.trim());
}

test("Using the filter directly", async (t) => {
  let { applyBaseToUrl } = HtmlBasePlugin;
  // url, base, pathprefix

  // default pathprefix
  t.is(applyBaseToUrl("/", "/"), "/");
  t.is(applyBaseToUrl("/test/", "/"), "/test/");
  t.is(applyBaseToUrl("subdir/", "/"), "subdir/");
  t.is(applyBaseToUrl("../subdir/", "/"), "../subdir/");
  t.is(applyBaseToUrl("./subdir/", "/"), "subdir/");
  t.is(applyBaseToUrl("http://example.com/", "/"), "http://example.com/");
  t.is(
    applyBaseToUrl("http://example.com/test/", "/"),
    "http://example.com/test/"
  );

  // relative url pathprefix is ignored
  t.is(applyBaseToUrl("/", "../"), "/");
  t.is(applyBaseToUrl("/test/", "../"), "/test/");
  t.is(applyBaseToUrl("subdir/", "../"), "subdir/");
  t.is(applyBaseToUrl("../subdir/", "../"), "../subdir/");
  t.is(applyBaseToUrl("./subdir/", "../"), "subdir/");
  t.is(applyBaseToUrl("http://example.com/", "../"), "http://example.com/");
  t.is(
    applyBaseToUrl("http://example.com/test/", "../"),
    "http://example.com/test/"
  );

  // with a pathprefix
  t.is(applyBaseToUrl("/", "/pathprefix/"), "/pathprefix/");
  t.is(applyBaseToUrl("/test/", "/pathprefix/"), "/pathprefix/test/");
  t.is(applyBaseToUrl("subdir/", "/pathprefix/"), "subdir/");
  t.is(applyBaseToUrl("../subdir/", "/pathprefix/"), "../subdir/");
  t.is(applyBaseToUrl("./subdir/", "/pathprefix/"), "subdir/");
  t.is(applyBaseToUrl("http://url.com/", "/pathprefix/"), "http://url.com/");
  t.is(
    applyBaseToUrl("http://url.com/test/", "/pathprefix/"),
    "http://url.com/test/"
  );

  // with a URL base
  t.is(applyBaseToUrl("/", "http://example.com/"), "http://example.com/");
  t.is(
    applyBaseToUrl("/test/", "http://example.com/"),
    "http://example.com/test/"
  );
  t.is(
    applyBaseToUrl("subdir/", "http://example.com/"),
    "http://example.com/subdir/"
  );
  t.is(
    applyBaseToUrl("../subdir/", "http://example.com/"),
    "http://example.com/subdir/"
  );
  t.is(
    applyBaseToUrl("./subdir/", "http://example.com/"),
    "http://example.com/subdir/"
  );
  t.is(
    applyBaseToUrl("http://url.com/", "http://example.com/"),
    "http://url.com/"
  );
  t.is(
    applyBaseToUrl("http://url.com/test/", "http://example.com/"),
    "http://url.com/test/"
  );

  // with a URL base with extra subdirectory
  t.is(
    applyBaseToUrl("/", "http://example.com/ignored/"),
    "http://example.com/"
  );
  t.is(
    applyBaseToUrl("/test/", "http://example.com/ignored/"),
    "http://example.com/test/"
  );
  t.is(
    applyBaseToUrl("subdir/", "http://example.com/deep/"),
    "http://example.com/deep/subdir/"
  );
  t.is(
    applyBaseToUrl("../subdir/", "http://example.com/deep/"),
    "http://example.com/subdir/"
  );
  t.is(
    applyBaseToUrl("./subdir/", "http://example.com/deep/"),
    "http://example.com/deep/subdir/"
  );
  t.is(
    applyBaseToUrl("http://url.com/", "http://example.com/ignored/"),
    "http://url.com/"
  );
  t.is(
    applyBaseToUrl("http://url.com/test/", "http://example.com/ignored/"),
    "http://url.com/test/"
  );

  // with a URL base and root pathprefix
  t.is(
    applyBaseToUrl("/", "http://example.com/", { pathPrefix: "/" }),
    "http://example.com/"
  );
  t.is(
    applyBaseToUrl("/test/", "http://example.com/", { pathPrefix: "/" }),
    "http://example.com/test/"
  );
  t.is(
    applyBaseToUrl("subdir/", "http://example.com/", { pathPrefix: "/" }),
    "http://example.com/subdir/"
  );
  t.is(
    applyBaseToUrl("../subdir/", "http://example.com/", { pathPrefix: "/" }),
    "http://example.com/subdir/"
  );
  t.is(
    applyBaseToUrl("./subdir/", "http://example.com/", { pathPrefix: "/" }),
    "http://example.com/subdir/"
  );
  t.is(
    applyBaseToUrl("http://url.com/", "http://example.com/", {
      pathPrefix: "/",
    }),
    "http://url.com/"
  );
  t.is(
    applyBaseToUrl("http://url.com/test/", "http://example.com/", {
      pathPrefix: "/",
    }),
    "http://url.com/test/"
  );

  // with a base and pathprefix
  t.is(
    applyBaseToUrl("/", "http://example.com/", { pathPrefix: "/pathprefix/" }),
    "http://example.com/pathprefix/"
  );
  t.is(
    applyBaseToUrl("/test/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
    }),
    "http://example.com/pathprefix/test/"
  );
  t.is(
    applyBaseToUrl("subdir/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
    }),
    "http://example.com/pathprefix/subdir/"
  );
  t.is(
    applyBaseToUrl("../subdir/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
    }),
    "http://example.com/pathprefix/subdir/"
  );
  t.is(
    applyBaseToUrl("./subdir/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
    }),
    "http://example.com/pathprefix/subdir/"
  );
  t.is(
    applyBaseToUrl("http://url.com/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
    }),
    "http://url.com/"
  );
  t.is(
    applyBaseToUrl("http://url.com/test/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
    }),
    "http://url.com/test/"
  );

  // with a base and pathprefix and page url (for relative path urls)
  t.is(
    applyBaseToUrl("/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/"
  );
  t.is(
    applyBaseToUrl("/test/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/test/"
  );
  t.is(
    applyBaseToUrl("subdir/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/deep/subdir/"
  );
  t.is(
    applyBaseToUrl("../subdir/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/subdir/"
  );
  t.is(
    applyBaseToUrl("./subdir/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/deep/subdir/"
  );
  t.is(
    applyBaseToUrl("http://url.com/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://url.com/"
  );
  t.is(
    applyBaseToUrl("http://url.com/test/", "http://example.com/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://url.com/test/"
  );

  // with a base (with extra subdir) and pathprefix and page url (for relative path urls)
  // Note: Extra subdir is ignored when pageUrl is in play
  t.is(
    applyBaseToUrl("/", "http://example.com/ignored/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/"
  );
  t.is(
    applyBaseToUrl("/test/", "http://example.com/ignored/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/test/"
  );
  t.is(
    applyBaseToUrl("subdir/", "http://example.com/ignored/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/deep/subdir/"
  );
  t.is(
    applyBaseToUrl("../subdir/", "http://example.com/ignored/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/subdir/"
  );
  t.is(
    applyBaseToUrl("./subdir/", "http://example.com/ignored/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://example.com/pathprefix/deep/subdir/"
  );
  t.is(
    applyBaseToUrl("http://url.com/", "http://example.com/ignored/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://url.com/"
  );
  t.is(
    applyBaseToUrl("http://url.com/test/", "http://example.com/ignored/", {
      pathPrefix: "/pathprefix/",
      pageUrl: "/deep/",
    }),
    "http://url.com/test/"
  );
});

test("Using the HTML base plugin (default values)", async (t) => {
  let elev = new Eleventy("./test/stubs-base/", "./test/stubs-base/_site", {
    configPath: false,
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(HtmlBasePlugin);
    },
  });
  elev.setIsVerbose(false);
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/deep/index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<style>div { background-image: url(test.jpg); }</style>
<style>div { background-image: url(/test.jpg); }</style>
<link rel="stylesheet" href="/test.css">
<script src="/test.js"></script>
</head>
<body>
<a href="/">Home</a>
<a href="subdir/">Test</a>
<a href="../subdir/">Test</a>
</body>
</html>`
  );
});

test("Using the HTML base plugin with pathPrefix: /test/", async (t) => {
  let elev = new Eleventy("./test/stubs-base/", "./test/stubs-base/_site", {
    pathPrefix: "/test/",

    configPath: false,
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(HtmlBasePlugin);
    },
  });
  elev.setIsVerbose(false);
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/deep/index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<style>div { background-image: url(test.jpg); }</style>
<style>div { background-image: url(/test/test.jpg); }</style>
<link rel="stylesheet" href="/test/test.css">
<script src="/test/test.js"></script>
</head>
<body>
<a href="/test/">Home</a>
<a href="subdir/">Test</a>
<a href="../subdir/">Test</a>
</body>
</html>`
  );
});

test("Using the HTML base plugin with pathPrefix: /test/ and base: http://example.com/", async (t) => {
  let elev = new Eleventy("./test/stubs-base/", "./test/stubs-base/_site", {
    pathPrefix: "/test/",

    configPath: false,
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(HtmlBasePlugin, {
        baseHref: "http://example.com/",
      });
    },
  });

  elev.setIsVerbose(false);
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/deep/index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<style>div { background-image: url(test.jpg); }</style>
<style>div { background-image: url(http://example.com/test/test.jpg); }</style>
<link rel="stylesheet" href="http://example.com/test/test.css">
<script src="http://example.com/test/test.js"></script>
</head>
<body>
<a href="http://example.com/test/">Home</a>
<a href="http://example.com/test/deep/subdir/">Test</a>
<a href="http://example.com/test/subdir/">Test</a>
</body>
</html>`
  );
});

test("Using the HTML base plugin strips extra path in full URL base (default pathPrefix)", async (t) => {
  let elev = new Eleventy("./test/stubs-base/", "./test/stubs-base/_site", {
    configPath: false,
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(HtmlBasePlugin, {
        baseHref: "http://example.com/hello/", // extra path will be stripped
      });
    },
  });

  elev.setIsVerbose(false);
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/deep/index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<style>div { background-image: url(test.jpg); }</style>
<style>div { background-image: url(http://example.com/test.jpg); }</style>
<link rel="stylesheet" href="http://example.com/test.css">
<script src="http://example.com/test.js"></script>
</head>
<body>
<a href="http://example.com/">Home</a>
<a href="http://example.com/deep/subdir/">Test</a>
<a href="http://example.com/subdir/">Test</a>
</body>
</html>`
  );
});

test("Using the HTML base plugin strips extra path in full URL base (pathPrefix: /test/)", async (t) => {
  let elev = new Eleventy("./test/stubs-base/", "./test/stubs-base/_site", {
    pathPrefix: "/test/",

    configPath: false,
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(HtmlBasePlugin, {
        baseHref: "http://example.com/hello/", // extra path will be stripped
      });
    },
  });

  elev.setIsVerbose(false);
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/deep/index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<style>div { background-image: url(test.jpg); }</style>
<style>div { background-image: url(http://example.com/test/test.jpg); }</style>
<link rel="stylesheet" href="http://example.com/test/test.css">
<script src="http://example.com/test/test.js"></script>
</head>
<body>
<a href="http://example.com/test/">Home</a>
<a href="http://example.com/test/deep/subdir/">Test</a>
<a href="http://example.com/test/subdir/">Test</a>
</body>
</html>`
  );
});

test("Opt out of the transform with falsy extensions list", async (t) => {
  let elev = new Eleventy("./test/stubs-base/", "./test/stubs-base/_site", {
    pathPrefix: "/test/",

    configPath: false,
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(HtmlBasePlugin, {
        extensions: false,
      });
    },
  });

  elev.setIsVerbose(false);
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/deep/index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<style>div { background-image: url(test.jpg); }</style>
<style>div { background-image: url(/test/test.jpg); }</style>
<link rel="stylesheet" href="/test.css">
<script src="/test.js"></script>
</head>
<body>
<a href="/">Home</a>
<a href="subdir/">Test</a>
<a href="../subdir/">Test</a>
</body>
</html>`
  );
});

test("Base plugin with permalink: false, #2602", async (t) => {
  let elev = new Eleventy("./test/stubs-2602/", "./test/stubs-2602/_site", {
    pathPrefix: "/test/",

    configPath: false,
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(HtmlBasePlugin);
    },
  });

  elev.setIsVerbose(false);
  elev.disableLogger();

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/deep/index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="">
<title></title>
<style>div { background-image: url(test.jpg); }</style>
<style>div { background-image: url(/test/test.jpg); }</style>
<link rel="stylesheet" href="/test/test.css">
<script src="/test/test.js"></script>
</head>
<body>
<a href="/test/">Home</a>
<a href="subdir/">Test</a>
<a href="../subdir/">Test</a>
</body>
</html>`
  );
});
