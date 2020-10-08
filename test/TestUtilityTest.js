const test = require("ava");
const normalizeNewLines = require("./Util/normalizeNewLines");

test("normalizeNewLines", (t) => {
  t.is(normalizeNewLines("\n"), "\n");
  t.is(normalizeNewLines("\r\n"), "\n");
  t.is(normalizeNewLines("\r\n\n"), "\n\n");
  t.is(normalizeNewLines("\r\n\r\n"), "\n\n");
  t.is(normalizeNewLines("a\r\nhello\r\nhi"), "a\nhello\nhi");
});
