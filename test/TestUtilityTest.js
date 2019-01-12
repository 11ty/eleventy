import test from "ava";
import normalizeNewLines from "./Util/normalizeNewLines";

test("normalizeNewLines", t => {
  t.is(normalizeNewLines("\r"), "");
  t.is(normalizeNewLines("\\r"), "\\r");
  t.is(normalizeNewLines("\r\n"), "\n");
  t.is(normalizeNewLines("\r\n\r"), "\n");
  t.is(normalizeNewLines("\r\n\n"), "\n\n");
});
