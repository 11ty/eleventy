import test from "ava";
import TemplateRender from "../src/TemplateRender";
import EleventyExtensionMap from "../src/EleventyExtensionMap";
import templateConfig from "../src/Config";
import Vue from "vue";
const renderer = require("vue-server-renderer").createRenderer();

function getNewTemplateRender(name, inputDir) {
  let tr = new TemplateRender(name, inputDir);
  tr.extensionMap = new EleventyExtensionMap();
  return tr;
}

test("Custom plaintext Render", async t => {
  let tr = getNewTemplateRender("txt");

  const config = templateConfig.getConfig();
  tr.config = Object.assign({}, config);
  tr.config.extensionMap.add({
    extension: "txt",
    key: "txt",
    compile: function(str, inputPath) {
      // plaintext
      return function(data) {
        return str;
      };
    }
  });

  let fn = await tr.getCompiledTemplate("<p>Paragraph</p>");
  t.is(await fn(), "<p>Paragraph</p>");
  t.is(await fn({}), "<p>Paragraph</p>");
});

test("Custom Vue Render", async t => {
  let tr = getNewTemplateRender("vue");

  const config = templateConfig.getConfig();
  tr.config = Object.assign({}, config);
  tr.config.extensionMap.add({
    extension: "vue",
    key: "vue",
    compile: function(str, inputPath) {
      return async function(data) {
        const app = new Vue({
          template: str,
          data: data
        });

        return renderer.renderToString(app);
      };
    }
  });

  let fn = await tr.getCompiledTemplate(`<p v-html="test">Paragraph</p>`);
  t.is(await fn({ test: "Hello" }), `<p data-server-rendered="true">Hello</p>`);
});
