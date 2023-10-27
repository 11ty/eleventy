import test from "ava";
import path from "path";

import PathNormalizer from "../src/Util/PathNormalizer.js";

test("PathNormalize Separator", (t) => {
  t.is(PathNormalizer.normalizeSeperator("."), ".");
  t.is(PathNormalizer.normalizeSeperator("a/b"), "a/b");
  t.is(PathNormalizer.normalizeSeperator("a\\b").replace(/\\/g, path.sep), "a/b");
  t.is(PathNormalizer.normalizeSeperator("a\\b/c").replace(/\\/g, path.sep), "a/b/c");
  t.is(PathNormalizer.normalizeSeperator(undefined), undefined);
});
