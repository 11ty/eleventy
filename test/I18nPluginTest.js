const test = require("ava");
const { Comparator } = require("../src/Plugins/I18nPlugin");

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
