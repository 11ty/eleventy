import test from "ava";
import UserConfig from "../src/UserConfig.js";

test("addMarkdownHighlighter logs warning and sets highlighter", (t) => {
  const config = new UserConfig();

  const originalWarn = console.warn;
  let logged = "";
  console.warn = (msg) => { logged = msg; };

  const fakeHighlighter = () => {};
  config.addMarkdownHighlighter(fakeHighlighter);

  t.true(logged.includes("deprecated"));
  t.is(config.markdownHighlighter, fakeHighlighter);

  console.warn = originalWarn;
});
