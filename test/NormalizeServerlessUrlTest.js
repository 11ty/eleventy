import test from "ava";
import normalizeServerlessUrl from "../src/Util/NormalizeServerlessUrl.js";

test("serverlessUrl Stringify", (t) => {
  // Straight string
  t.is(normalizeServerlessUrl("/test/"), "/test/");

  // transform the trailing wildcard
  t.is(normalizeServerlessUrl("/test/*"), "/test/(.*)");
});
