import test from "ava";
import TemplateRender from "../src/TemplateRender";
import md from "markdown-it";

const createTestMarkdownPlugin = () => {
  const plugin = md => {
    md.core.ruler.after("inline", "replace-link", function(state) {
      plugin.environment = state.env;
      const link = state.tokens[1].children[0].attrs[0][1];
      state.tokens[1].children[0].attrs[0][1] = `${link}?data=${state.env.some}`;
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
  t.is(result, '<p><a href="http://link.com?data=data">link text</a></p>\n');
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
  t.is(result, '<p><a href="http://link.com?data=data">link text</a></p>\n');
});
