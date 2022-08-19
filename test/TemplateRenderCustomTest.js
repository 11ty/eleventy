import test from "ava";
import TemplateData from "../src/TemplateData.js";
import TemplateRender from "../src/TemplateRender.js";
import EleventyExtensionMap from "../src/EleventyExtensionMap.js";
import TemplateConfig from "../src/TemplateConfig.js";
import getNewTemplate from "./_getNewTemplateForTests.js";

import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";

function getNewTemplateRender(name, inputDir, eleventyConfig) {
  if (!eleventyConfig) {
    eleventyConfig = new TemplateConfig();
  }
  let tr = new TemplateRender(name, inputDir, eleventyConfig);
  tr.extensionMap = new EleventyExtensionMap([], eleventyConfig);
  return tr;
}

test("Custom plaintext Render", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  let tr = getNewTemplateRender("txt", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("<p>Paragraph</p>");
  t.is(await fn(), "<p>Paragraph</p>");
  t.is(await fn({}), "<p>Paragraph</p>");
});

test("Custom Markdown Render with `compile` override", async (t) => {
  let eleventyConfig = new TemplateConfig();

  eleventyConfig.userConfig.extensionMap.add({
    extension: "md",
    key: "md",
    compile: function (str, inputPath) {
      return function (data) {
        return `<not-markdown>${str.trim()}</not-markdown>`;
      };
    },
  });

  let tr = getNewTemplateRender("md", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("# Markdown?");
  t.is((await fn()).trim(), "<not-markdown># Markdown?</not-markdown>");
  t.is((await fn({})).trim(), "<not-markdown># Markdown?</not-markdown>");
});

test("Custom Markdown Render without `compile` override", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let initCalled = false;

  eleventyConfig.userConfig.extensionMap.add({
    extension: "md",
    key: "md",
    init: function () {
      initCalled = true;
    },
  });

  let tr = getNewTemplateRender("md", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("# Header");
  t.is(initCalled, true);
  t.is((await fn()).trim(), "<h1>Header</h1>");
  t.is((await fn({})).trim(), "<h1>Header</h1>");
});

test("Custom Markdown Render with `compile` override + call to default compiler", async (t) => {
  let eleventyConfig = new TemplateConfig();

  eleventyConfig.userConfig.extensionMap.add({
    extension: "md",
    key: "md",
    compile: function (str, inputPath) {
      return async function (data) {
        const result = await this.defaultRenderer(data);
        return `<custom-wrapper>${result.trim()}</custom-wrapper>`;
      };
    },
  });

  let tr = getNewTemplateRender("md", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("Hey {{name}}");
  t.is((await fn()).trim(), "<custom-wrapper><p>Hey</p></custom-wrapper>");
  t.is(
    (await fn({ name: "Zach" })).trim(),
    "<custom-wrapper><p>Hey Zach</p></custom-wrapper>"
  );
});

test("Custom Vue Render", async (t) => {
  let tr = getNewTemplateRender("vue");

  tr.eleventyConfig.userConfig.extensionMap.add({
    extension: "vue",
    key: "vue",
    compile: function (str) {
      return async function (data) {
        const app = createSSRApp({
          template: str,
          data: function () {
            return data;
          },
        });

        return renderToString(app);
      };
    },
  });

  let fn = await tr.getCompiledTemplate('<p v-html="test">Paragraph</p>');
  t.is(await fn({ test: "Hello" }), "<p>Hello</p>");
});

import { render } from "sass";

test("Custom Sass Render", async (t) => {
  let tr = getNewTemplateRender("sass");
  tr.eleventyConfig.userConfig.extensionMap.add({
    extension: "sass",
    key: "sass",
    compile: function (str, inputPath) {
      // TODO declare data variables as SASS variables?
      return async function (data) {
        return new Promise(function (resolve, reject) {
          render(
            {
              data: str,
              includePaths: [tr.inputDir, tr.includesDir],
              style: "expanded",
              indentType: "space",
              // TODO
              // sourcemap: "file",
              outFile: "test_this_is_to_not_write_a_file.css",
            },
            function (error, result) {
              if (error) {
                reject(error);
              } else {
                resolve(result.css.toString("utf8"));
              }
            }
          );
        });
      };
    },
  });

  let fn = await tr.getCompiledTemplate("$color: blue; p { color: $color; }");
  t.is(
    (await fn({})).trim(),
    `p {
  color: blue;
}`
  );
});

/*
serverPrefetch: function() {
    return this.getBlogAuthors().then(response => this.glossary = response)
  },
*/
test("JavaScript functions should not be mutable but not *that* mutable", async (t) => {
  t.plan(3);

  let eleventyConfig = new TemplateConfig();

  let instance = {
    dataForCascade: function () {
      // was mutating this.config.javascriptFunctions!
      this.shouldnotmutatethething = 1;
      return {};
    },
  };

  eleventyConfig.userConfig.extensionMap.add({
    extension: "js1",
    key: "js1",
    getData: ["dataForCascade"],
    getInstanceFromInputPath: function (inputPath) {
      t.truthy(true);
      return instance;
    },
    compile: function (str, inputPath) {
      t.falsy(this.config.javascriptFunctions.shouldnotmutatethething);

      // plaintext
      return (data) => {
        return str;
      };
    },
  });

  let tmpl = getNewTemplate(
    "./test/stubs-custom-extension/test.js1",
    "./test/stubs-custom-extension/",
    "dist",
    null,
    null,
    eleventyConfig
  );
  let data = await tmpl.getData();
  t.is(await tmpl.render(data), "<p>Paragraph</p>");
});

test("Return undefined in compile to ignore #2267", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.extensionMap.add({
    extension: "txt",
    key: "txt",
    compile: function (str, inputPath) {
      return;
    },
  });

  let tr = getNewTemplateRender("txt", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("<p>Paragraph</p>");
  t.is(fn, undefined);
});
