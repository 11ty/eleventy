const test = require("ava");
const PathNormalizer = require("../src/Util/PathNormalizer");

test("PathNormalize Seperator", (t) => {
  t.is(PathNormalizer.normalizeSeperator("."), ".");
  t.is(PathNormalizer.normalizeSeperator("a/b"), "a/b");
  t.is(PathNormalizer.normalizeSeperator("a\\b"), "a/b");
  t.is(PathNormalizer.normalizeSeperator("a\\b/c"), "a/b/c");
  t.is(PathNormalizer.normalizeSeperator(undefined), undefined);
});
