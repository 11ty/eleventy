import test from "ava";
import EleventyCommandCheck from "../src/EleventyCommandCheck";

test("Constructor", t => {
  let cmdCheck = new EleventyCommandCheck({});
  t.is(cmdCheck.toString(), "");
});

test("Has an argument", t => {
  let cmdCheck = new EleventyCommandCheck({
    input: "src"
  });
  t.is(cmdCheck.toString(), "--input=src");
});

test("Boolean argument", t => {
  let cmdCheck = new EleventyCommandCheck({
    version: true
  });
  t.is(cmdCheck.toString(), "--version");
});

test("Multiple arguments", t => {
  let cmdCheck = new EleventyCommandCheck({
    input: "src",
    version: true
  });

  // technically invalid but eleventy should quit early on --version
  t.is(cmdCheck.toString(), "--input=src --version");
});

test("getArgumentLookupMap", t => {
  let cmdCheck = new EleventyCommandCheck({});
  t.is(cmdCheck.getArgumentLookupMap()["input"], true);
  t.is(cmdCheck.getArgumentLookupMap()["version"], true);
  t.falsy(cmdCheck.getArgumentLookupMap()["not-an-arg"]);

  t.is(cmdCheck.isKnownArgument("input"), true);
  t.is(cmdCheck.isKnownArgument("version"), true);
  t.is(cmdCheck.isKnownArgument("unknown-thing"), false);

  t.is(cmdCheck.isKnownArgument("_"), true);
});

test("throws", t => {
  let cmdCheck = new EleventyCommandCheck({ "unknown-argument": true });
  t.throws(() => {
    cmdCheck.hasUnknownArguments();
  });
});
