import test from "ava";
import TemplateRender from "../src/TemplateRender";
import md from "markdown-it";

const createTestMarkdownPlugin = () => {
  const plugin = md => {
    md.core.ruler.after("inline", "replace-link", function(state) {
      plugin.environment = state.env;
      return false;
    });
  };
  plugin.environment = {};
  return plugin;
};

test("Markdown Render: with HTML prerender, sends context data to the markdown library", async t => {
  let tr = new TemplateRender("md");

  const plugin = createTestMarkdownPlugin();
  let mdLib = md().use(plugin);
  tr.engine.setLibrary(mdLib);

  const data = { some: "data" };

  let fn = await tr.getCompiledTemplate("[link text](http://link.com)");
  let result = await fn(data);
  t.deepEqual(plugin.environment, data);
});

test("Markdown Render: without HTML prerender, sends context data to the markdown library", async t => {
  let tr = new TemplateRender("md");

  const plugin = createTestMarkdownPlugin();
  let mdLib = md().use(plugin);
  tr.engine.setLibrary(mdLib);
  tr.setHtmlEngine(false);

  const data = { some: "data" };

  let fn = await tr.getCompiledTemplate("[link text](http://link.com)");
  let result = await fn(data);
  t.deepEqual(plugin.environment, data);
});
