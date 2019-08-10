import test from "ava";
import pluralize from "../src/Util/Pluralize";

test("Pluralize", t => {
  t.is(pluralize(0, "test", "tests"), "tests");
  t.is(pluralize(1, "test", "tests"), "test");
  t.is(pluralize(2, "test", "tests"), "tests");
  t.is(pluralize(3, "test", "tests"), "tests");
  t.is(pluralize(3.5, "test", "tests"), "tests");
});
