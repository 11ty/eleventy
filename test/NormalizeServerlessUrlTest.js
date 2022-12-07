const test = require("ava");
const normalizeServerlessUrl = require("../src/Util/NormalizeServerlessUrl");

test("serverlessUrl Stringify", (t) => {
  // Straight string
  t.is(normalizeServerlessUrl("/test/"), "/test/");

  // transform the trailing wildcard
  t.is(normalizeServerlessUrl("/test/*"), "/test/(.*)");
});
