const test = require("ava");
const TemplateRender = require("../src/TemplateRender");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const TemplateConfig = require("../src/TemplateConfig");
const Vue = require("vue");
const renderer = require("vue-server-renderer").createRenderer();

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

test("Custom Vue Render", async (t) => {
  let tr = getNewTemplateRender("vue");

  tr.eleventyConfig.userConfig.extensionMap.add({
    extension: "vue",
    key: "vue",
    compile: function (str, inputPath) {
      return async function (data) {
        const app = new Vue({
          template: str,
          data: data,
        });

        return renderer.renderToString(app);
      };
    },
  });

  let fn = await tr.getCompiledTemplate(`<p v-html="test">Paragraph</p>`);
  t.is(await fn({ test: "Hello" }), `<p data-server-rendered="true">Hello</p>`);
});

const sass = require("node-sass");

test("Custom Sass Render", async (t) => {
  let tr = getNewTemplateRender("sass");
  tr.eleventyConfig.userConfig.extensionMap.add({
    extension: "sass",
    key: "sass",
    compile: function (str, inputPath) {
      // TODO declare data variables as SASS variables?
      return async function (data) {
        return new Promise(function (resolve, reject) {
          sass.render(
            {
              data: str,
              includePaths: [tr.inputDir, tr.includesDir],
              style: "expanded",
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

  let fn = await tr.getCompiledTemplate(`$color: blue; p { color: $color; }`);
  t.is(
    (await fn({})).trim(),
    `p {
  color: blue; }`
  );
});
