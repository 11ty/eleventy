const test = require("ava");
const I18nPlugin = require("../src/Plugins/I18nPlugin");
const { Comparator } = I18nPlugin;
const Eleventy = require("../src/Eleventy");
const normalizeNewLines = require("./Util/normalizeNewLines");

test("Comparator.isLangCode", (t) => {
  t.is(Comparator.isLangCode("en"), true);
  t.is(Comparator.isLangCode("en-us"), true);
  t.is(Comparator.isLangCode("en_us"), true);

  t.is(Comparator.isLangCode("d"), false);
  t.is(Comparator.isLangCode("dee"), false);
  t.is(Comparator.isLangCode("deed"), false);
  t.is(Comparator.isLangCode("deede"), false);
  t.is(Comparator.isLangCode("deedee"), false);
});

test("Comparator.matchLanguageFolder", (t) => {
  // Note that template extensions are removed upstream by the plugin
  t.is(Comparator.matchLanguageFolder("/en/test.hbs", "/es/test.hbs"), true);
  t.is(Comparator.matchLanguageFolder("/en/test", "/es/test"), true);
  t.is(Comparator.matchLanguageFolder("/en_us/test", "/es/test"), true);
  t.is(Comparator.matchLanguageFolder("/es_mx/test", "/en-us/test"), true);

  // invalid first
  t.is(Comparator.matchLanguageFolder("/e/test.hbs", "/es/test.hbs"), false);
  t.is(Comparator.matchLanguageFolder("/n/test", "/es/test"), false);
  t.is(Comparator.matchLanguageFolder("/eus/test", "/es/test"), false);

  // invalid second
  t.is(Comparator.matchLanguageFolder("/en/test.hbs", "/e/test.hbs"), false);
  t.is(Comparator.matchLanguageFolder("/en/test", "/e/test"), false);
  t.is(Comparator.matchLanguageFolder("/en_us/test", "/s/test"), false);

  // both invalid
  t.is(Comparator.matchLanguageFolder("/esx/test", "/ens/test"), false);
});

test("contentMap Event from Eleventy", async (t) => {
  t.plan(3);
  let elev = new Eleventy("./test/stubs-i18n/", "./test/stubs-i18n/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(I18nPlugin);

      eleventyConfig.on("eleventy.contentMap", (maps) => {
        t.truthy(maps);
        t.deepEqual(maps.urlToInputPath, {
          "/en/": ["./test/stubs-i18n/en/index.liquid"],
          "/en_us/": ["./test/stubs-i18n/en_us/index.11ty.js"],
          "/es/": ["./test/stubs-i18n/es/index.njk"],
          "/non-lang-file/": ["./test/stubs-i18n/non-lang-file.njk"],
        });
        t.deepEqual(maps.inputPathToUrl, {
          "./test/stubs-i18n/en/index.liquid": ["/en/"],
          "./test/stubs-i18n/en_us/index.11ty.js": ["/en_us/"],
          "./test/stubs-i18n/es/index.njk": ["/es/"],
          "./test/stubs-i18n/non-lang-file.njk": ["/non-lang-file/"],
        });
      });
    },
  });

  let results = await elev.toJSON();
});

function getContentFor(results, filename) {
  let content = results.filter((entry) => entry.inputPath.endsWith(filename))[0]
    .content;
  return normalizeNewLines(content.trim());
}

test("locale_url and locale_links Filters", async (t) => {
  let elev = new Eleventy("./test/stubs-i18n/", "./test/stubs-i18n/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(I18nPlugin);
    },
  });

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/non-lang-file.njk"),
    `/en/
/non-lang-file/`
  );

  t.is(
    getContentFor(results, "/es/index.njk"),
    `/es/
/non-lang-file/
/en_us/,/en/`
  );

  t.is(
    getContentFor(results, "/en/index.liquid"),
    `/en/
/non-lang-file/
/en_us//es/`
  );

  t.is(
    getContentFor(results, "/en_us/index.11ty.js"),
    `/en_us/
/non-lang-file/
/en/,/es/`
  );
});
