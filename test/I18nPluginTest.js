const test = require("ava");
const I18nPlugin = require("../src/Plugins/I18nPlugin");
const { Comparator, LangUtils } = I18nPlugin;
const Eleventy = require("../src/Eleventy");
const normalizeNewLines = require("./Util/normalizeNewLines");

test("Comparator.isLangCode", (t) => {
  t.is(Comparator.isLangCode(null), false);
  t.is(Comparator.isLangCode(undefined), false);

  t.is(Comparator.isLangCode("en"), true);
  t.is(Comparator.isLangCode("en-us"), true);

  t.is(Comparator.isLangCode("dee"), false);
  t.is(Comparator.isLangCode("en_us"), false);
  t.is(Comparator.isLangCode("d"), false);
  t.is(Comparator.isLangCode("deed"), false);
  t.is(Comparator.isLangCode("deede"), false);
  t.is(Comparator.isLangCode("deedee"), false);
});

test("LangUtils.swapLanguageCode", (t) => {
  t.is(LangUtils.swapLanguageCode("/"), "/"); // skip
  t.is(LangUtils.swapLanguageCode("/", "en"), "/"); // skip
  t.is(LangUtils.swapLanguageCode("/es/", "en"), "/en/");
  t.is(LangUtils.swapLanguageCode("/es/", "not"), "/es/"); // skip
  t.is(LangUtils.swapLanguageCode("/not-a-lang/", "en"), "/not-a-lang/"); // skip
  t.is(LangUtils.swapLanguageCode("/es/es/es/", "en"), "/en/es/es/"); // first only
});

test("Comparator.matchLanguageFolder", (t) => {
  t.deepEqual(Comparator.matchLanguageFolder("/en/test.hbs", "/es/test.hbs"), [
    "en",
    "es",
  ]);

  // Note that template extensions and input directory paths are removed upstream by the plugin
  t.deepEqual(Comparator.matchLanguageFolder("/en/test", "/es/test"), [
    "en",
    "es",
  ]);
  t.deepEqual(Comparator.matchLanguageFolder("/en-us/test", "/es/test"), [
    "en-us",
    "es",
  ]);
  t.deepEqual(Comparator.matchLanguageFolder("/es-mx/test", "/en-us/test"), [
    "es-mx",
    "en-us",
  ]);
  t.deepEqual(Comparator.matchLanguageFolder("en/test", "es/test"), [
    "en",
    "es",
  ]);
  t.deepEqual(Comparator.matchLanguageFolder("en/test", "src/test"), false);
  t.deepEqual(Comparator.matchLanguageFolder("en/test", "xx/test"), false);

  // Even though `src` is possibly valid, we only match the first one
  t.deepEqual(Comparator.matchLanguageFolder("en/src/test", "es/src/test"), [
    "en",
    "es",
  ]);

  // invalid first
  t.is(Comparator.matchLanguageFolder("/e/test.hbs", "/es/test.hbs"), false);
  t.is(Comparator.matchLanguageFolder("/n/test", "/es/test"), false);
  t.is(Comparator.matchLanguageFolder("/eus/test", "/es/test"), false);

  // invalid second
  t.is(Comparator.matchLanguageFolder("/en/test.hbs", "/e/test.hbs"), false);
  t.is(Comparator.matchLanguageFolder("/en/test", "/e/test"), false);
  t.is(Comparator.matchLanguageFolder("/en-us/test", "/s/test"), false);

  // invalid both
  t.deepEqual(Comparator.matchLanguageFolder("/esx/test", "/ens/test"), false);
});

test("contentMap Event from Eleventy", async (t) => {
  t.plan(4);
  let elev = new Eleventy("./test/stubs-i18n/", "./test/stubs-i18n/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(I18nPlugin, {
        defaultLanguage: "en",
        errorMode: "allow-fallback",
      });

      eleventyConfig.on("eleventy.contentMap", (maps) => {
        t.truthy(maps);

        // if future maps are added, they should be tested here
        t.is(Object.keys(maps).length, 2);
        t.deepEqual(maps.urlToInputPath, {
          "/en/": "./test/stubs-i18n/en/index.liquid",
          "/en-us/": "./test/stubs-i18n/en-us/index.11ty.js",
          "/es/": "./test/stubs-i18n/es/index.njk",
          "/non-lang-file/": "./test/stubs-i18n/non-lang-file.njk",
        });

        t.deepEqual(maps.inputPathToUrl, {
          "./test/stubs-i18n/en/index.liquid": ["/en/"],
          "./test/stubs-i18n/en-us/index.11ty.js": ["/en-us/"],
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

test("errorMode default", async (t) => {
  let elev = new Eleventy("./test/stubs-i18n/", "./test/stubs-i18n/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(I18nPlugin, {
        defaultLanguage: "en",
        // errorMode: "allow-fallback"
      });
    },
  });
  elev.setIsVerbose(false);
  elev.disableLogger();

  await t.throwsAsync(async () => {
    await elev.toJSON();
  });
});

test("locale_url and locale_links Filters", async (t) => {
  let elev = new Eleventy("./test/stubs-i18n/", "./test/stubs-i18n/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(I18nPlugin, {
        defaultLanguage: "en",
        errorMode: "allow-fallback",
      });
    },
  });

  let results = await elev.toJSON();
  t.is(
    getContentFor(results, "/non-lang-file.njk"),
    `/en/
/en-us/
/non-lang-file/
[]
[]
en`
  );

  t.is(
    getContentFor(results, "/es/index.njk"),
    `/es/
/es/
/es/
/en-us/
/non-lang-file/
[{"url":"/en/","lang":"en","label":"English"},{"url":"/en-us/","lang":"en-us","label":"English"}]
[{"url":"/en/","lang":"en","label":"English"},{"url":"/en-us/","lang":"en-us","label":"English"}]
es`
  );

  t.is(
    getContentFor(results, "/en/index.liquid"),
    `/en/
/en/
/en/
/en-us/
/non-lang-file/
[{"url":"/en-us/","lang":"en-us","label":"English"},{"url":"/es/","lang":"es","label":"Español"}]
[{"url":"/en-us/","lang":"en-us","label":"English"},{"url":"/es/","lang":"es","label":"Español"}]
en`
  );

  t.is(
    getContentFor(results, "/en-us/index.11ty.js"),
    `/en-us/
/en-us/
/en-us/
/es/
/non-lang-file/
[{"url":"/en/","lang":"en","label":"English"},{"url":"/es/","lang":"es","label":"Español"}]
[{"url":"/en/","lang":"en","label":"English"},{"url":"/es/","lang":"es","label":"Español"}]
en-us`
  );
});
