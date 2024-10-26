import test from "ava";
import EleventyCompatibility from "../src/Util/Compatibility.js";

test(".canary- to .alpha- normalization (because pre-releases are alphabetic comparisons 😭)", (t) => {
  t.is(EleventyCompatibility.normalizeIdentifier("2.0.0"), "2.0.0");
  t.is(EleventyCompatibility.normalizeIdentifier("2.0.0-beta.1"), "2.0.0-beta.1");
  t.is(EleventyCompatibility.normalizeIdentifier("2.0.0-canary.1"), "2.0.0-alpha.1");
  t.is(EleventyCompatibility.normalizeIdentifier("2.0.0-alpha.1"), "2.0.0-alpha.1");
  t.is(EleventyCompatibility.normalizeIdentifier(">=2.0.0-beta.1"), ">=2.0.0-beta.1");
  t.is(
    EleventyCompatibility.normalizeIdentifier(">=2.0.0-beta.1 || >=2.0.0-canary.1"),
    ">=2.0.0-beta.1 || >=2.0.0-alpha.1"
  );
});

test("Version checking for plugin compatibility >=0.5.4", (t) => {
  let range = ">=0.5.4";
  t.true(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.3", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=0.6", (t) => {
  let range = ">=0.6";
  t.true(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.3", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=1", (t) => {
  let range = ">=1"; // **not** the same as >=1.0.0
  t.true(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=1.0.0", (t) => {
  let range = ">=1.0.0"; // **not** the same as >=1
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=1.0.0 || >=1.0.0-beta || >=1.0.0-canary", (t) => {
  // could be simplified to >=1
  // noting that pre-1.0 versions of Eleventy did not match prereleases—which doesn’t matter because 0.12 would return false here anyway.
  let range = ">=1.0.0 || >=1.0.0-beta || >=1.0.0-canary";
  t.true(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2", (t) => {
  let range = ">=2";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.3", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0", (t) => {
  // Recommend to use >=2 instead of this
  let range = ">=2.0.0";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.3", range)); // Contentious! I wish this were true
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.18", range)); // Contentious! I wish this were true
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.19", range)); // Contentious! I wish this were true
  t.false(EleventyCompatibility.satisfies("2.0.0-beta.1", range)); // Contentious! I wish this were true
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0-canary", (t) => {
  // Recommend to use >=2 instead of this
  let range = ">=2.0.0-canary";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.3", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0-canary.1", (t) => {
  // Recommend to use >=2 instead of this
  let range = ">=2.0.0-canary.1";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.3", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0-beta", (t) => {
  let range = ">=2.0.0-beta";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0-beta.1", (t) => {
  let range = ">=2.0.0-beta.1";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0-beta.2", (t) => {
  let range = ">=2.0.0-beta.2";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

// TODO eleventy-upgrade-help
test("Version checking for plugin compatibility >=2 <3", (t) => {
  let range = ">=2 <3";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.false(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.false(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0-canary.19", (t) => {
  let range = ">=2.0.0-canary.19";
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0-canary.19 || >=2.0.0-beta.1", (t) => {
  let range = ">=2.0.0-canary.19 || >=2.0.0-beta.1"; // can be simplified to >=2.0.0-canary.19
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});

test("Version checking for plugin compatibility >=2.0.0-canary.19 || >=2.0.0-beta.2", (t) => {
  let range = ">=2.0.0-canary.19 || >=2.0.0-beta.2"; // same as ">=2.0.0-canary.19"
  t.false(EleventyCompatibility.satisfies("1.0.0-beta.1", range));
  t.false(EleventyCompatibility.satisfies("1.0.2", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary", range));
  t.false(EleventyCompatibility.satisfies("2.0.0-canary.18", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-canary.19", range));
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.1", range)); // warning: this matches because of >=2.0.0-canary.19
  t.true(EleventyCompatibility.satisfies("2.0.0-beta.2", range));
  t.true(EleventyCompatibility.satisfies("2.0.0", range));
  t.true(EleventyCompatibility.satisfies("2.0.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-canary.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0-beta.1", range));
  t.true(EleventyCompatibility.satisfies("3.0.0", range));
});
