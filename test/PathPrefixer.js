import test from "ava";
import path from "path";

import PathPrefixer from "../src/Util/PathPrefixer.js";

test("joinUrlParts", (t) => {
  t.is(PathPrefixer.joinUrlParts("a"), "a");
  t.is(PathPrefixer.joinUrlParts("a", "b"), "a/b");
  t.is(PathPrefixer.joinUrlParts("", "a", "b"), "a/b");
  t.is(PathPrefixer.joinUrlParts("/a", "b"), "/a/b");
  t.is(PathPrefixer.joinUrlParts("a", "b", "c"), "a/b/c");
  t.is(PathPrefixer.joinUrlParts("a/b", "c/"), "a/b/c/");
});

test("joinUrlParts (Windows)", (t) => {
  // The replace calls are needed, since "\" is a valid path char on unix
  t.is(PathPrefixer.joinUrlParts("a"), "a");
  t.is(PathPrefixer.joinUrlParts("a\\b".replace(/\\/g, path.sep)), "a/b");
  t.is(PathPrefixer.joinUrlParts("\\a\\b".replace(/\\/g, path.sep)), "/a/b");
  t.is(PathPrefixer.joinUrlParts("a\\b\\c".replace(/\\/g, path.sep)), "a/b/c");
  t.is(PathPrefixer.joinUrlParts("a\\b".replace(/\\/g, path.sep), "c"), "a/b/c");
  t.is(PathPrefixer.joinUrlParts("a\\b\\c\\".replace(/\\/g, path.sep)), "a/b/c/");
  t.is(PathPrefixer.joinUrlParts("a\\b/c\\".replace(/\\/g, path.sep)), "a/b/c/");
});

test("normalizePathPrefix", (t) => {
  t.is(PathPrefixer.normalizePathPrefix("a"), "/a");
  t.is(PathPrefixer.normalizePathPrefix("a/b"), "/a/b");
  t.is(PathPrefixer.normalizePathPrefix("/a/b"), "/a/b");
  t.is(PathPrefixer.normalizePathPrefix("/"), "/");
  t.is(PathPrefixer.normalizePathPrefix(""), "/");
  t.is(PathPrefixer.normalizePathPrefix(undefined), "/");
});
