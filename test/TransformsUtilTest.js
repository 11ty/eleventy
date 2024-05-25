import test from "ava";
import TransformsUtil from "../src/Util/TransformsUtil.js";

test("TransformsUtil.overrideOutputPath", (t) => {
  t.is(TransformsUtil.overrideOutputPath(false), false);
  t.is(TransformsUtil.overrideOutputPath(false, false), false);
  t.is(TransformsUtil.overrideOutputPath(false, "z"), ".z");
  t.is(TransformsUtil.overrideOutputPath(false, ".z"), ".z");

  // empty string
  t.is(TransformsUtil.overrideOutputPath("", "z"), ".z");
  t.is(TransformsUtil.overrideOutputPath("", ".z"), ".z");

  // test.html
  t.is(TransformsUtil.overrideOutputPath("test.html", false), "test.html");
  t.is(TransformsUtil.overrideOutputPath("test.html", ".z"), "test.z");
  t.is(TransformsUtil.overrideOutputPath("test.html", "z"), "test.z");

  // test.b.html
  t.is(TransformsUtil.overrideOutputPath("test.b.html", false), "test.b.html");
  t.is(TransformsUtil.overrideOutputPath("test.b.html", ".z"), "test.b.z");
  t.is(TransformsUtil.overrideOutputPath("test.b.html", "z"), "test.b.z");

  // /test.html
  t.is(TransformsUtil.overrideOutputPath("/test.html", false), "/test.html");
  t.is(TransformsUtil.overrideOutputPath("/test.html", ".z"), "/test.z");
  t.is(TransformsUtil.overrideOutputPath("/test.html", "z"), "/test.z");
  t.is(TransformsUtil.overrideOutputPath("/test.html", "html"), "/test.html");
  t.is(TransformsUtil.overrideOutputPath("/test.html", ".html"), "/test.html");

  // more complex overrides are treated as full path overrides, not file extensions
  t.is(TransformsUtil.overrideOutputPath("test.html", "hello.z"), "hello.z");
  t.is(TransformsUtil.overrideOutputPath("/test.html", "test2.html"), "test2.html");
  t.is(TransformsUtil.overrideOutputPath("/test.html", "/hi/test2.html"), "/hi/test2.html");
});
