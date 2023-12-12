import test from "ava";
import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import * as sass from "sass";

import TemplateRender from "../src/TemplateRender.js";
import EleventyExtensionMap from "../src/EleventyExtensionMap.js";
import TemplateConfig from "../src/TemplateConfig.js";
import getNewTemplate from "./_getNewTemplateForTests.js";
import { renderTemplate } from "./_getRenderedTemplates.js";


async function getNewTemplateRender(name, inputDir, eleventyConfig, extensionMap) {
  if (!eleventyConfig) {
    eleventyConfig = new TemplateConfig();
    await eleventyConfig.init();
  }

  if (!extensionMap) {
    extensionMap = new EleventyExtensionMap([], eleventyConfig);
  }

  let tr = new TemplateRender(name, inputDir, eleventyConfig);
  tr.extensionMap = extensionMap;
  await tr.init();

  return tr;
}

test("Custom plaintext Render", async (t) => {
  let eleventyConfig = new TemplateConfig();
  // addExtension() API
  eleventyConfig.userConfig.addExtension("txt", {
    compile: function (str, inputPath) {
      // plaintext
      return function (data) {
        return str;
      };
    },
  });

  await eleventyConfig.init();

  let tr = await getNewTemplateRender("txt", null, eleventyConfig);
  let fn = await tr.getCompiledTemplate("<p>Paragraph</p>");
  t.is(await fn(), "<p>Paragraph</p>");
  t.is(await fn({}), "<p>Paragraph</p>");
});

test("Custom Markdown Render with `compile` override", async (t) => {
  let eleventyConfig = new TemplateConfig();

  // addExtension() API
  eleventyConfig.userConfig.addExtension("md", {
    compile: function (str, inputPath) {
      return function (data) {
        return `<not-markdown>${str.trim()}</not-markdown>`;
      };
    },
  });

  await eleventyConfig.init();

  let tr = await getNewTemplateRender("md", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("# Markdown?");
  t.is((await fn()).trim(), "<not-markdown># Markdown?</not-markdown>");
  t.is((await fn({})).trim(), "<not-markdown># Markdown?</not-markdown>");
});

test("Custom Markdown Render without `compile` override", async (t) => {
  let eleventyConfig = new TemplateConfig();
  let initCalled = false;

  // addExtension() API
  eleventyConfig.userConfig.addExtension("md", {
    init: function () {
      initCalled = true;
    },
  });

  await eleventyConfig.init();

  let tr = await getNewTemplateRender("md", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("# Header");
  t.is(initCalled, true);
  t.is((await fn()).trim(), "<h1>Header</h1>");
  t.is((await fn({})).trim(), "<h1>Header</h1>");
});

test("Custom Markdown Render with `compile` override + call to default compiler", async (t) => {
  let eleventyConfig = new TemplateConfig();

  // addExtension() API
  eleventyConfig.userConfig.addExtension("md", {
    compile: function (str, inputPath) {
      return async function (data) {
        const result = await this.defaultRenderer(data);
        return `<custom-wrapper>${result.trim()}</custom-wrapper>`;
      };
    },
  });

  await eleventyConfig.init();

  let tr = await getNewTemplateRender("md", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("Hey {{name}}");
  t.is((await fn()).trim(), "<custom-wrapper><p>Hey</p></custom-wrapper>");
  t.is((await fn({ name: "Zach" })).trim(), "<custom-wrapper><p>Hey Zach</p></custom-wrapper>");
});

test("Custom Vue Render", async (t) => {
  let eleventyConfig = new TemplateConfig();
  // addExtension() API
  eleventyConfig.userConfig.addExtension("vue", {
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
  await eleventyConfig.init();

  let tr = await getNewTemplateRender("vue", null, eleventyConfig);
  let fn = await tr.getCompiledTemplate('<p v-html="test">Paragraph</p>');
  t.is(await fn({ test: "Hello" }), "<p>Hello</p>");
});

test("Custom Sass Render", async (t) => {
  let eleventyConfig = new TemplateConfig();

  // addExtension() API
  eleventyConfig.userConfig.addExtension("sass", {
    compile: function (str, inputPath) {
      // TODO declare data variables as SASS variables?
      return async function (data) {
        return new Promise(function (resolve, reject) {
          sass.render(
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
            },
          );
        });
      };
    },
  });

  await eleventyConfig.init();

  let tr = await getNewTemplateRender("sass", null, eleventyConfig);
  let fn = await tr.getCompiledTemplate("$color: blue; p { color: $color; }");
  t.is(
    (await fn({})).trim(),
    `p {
  color: blue;
}`,
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

  // addExtension() API
  eleventyConfig.userConfig.addExtension("js1", {
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

  await eleventyConfig.init();

  let tmpl = await getNewTemplate(
    "./test/stubs-custom-extension/test.js1",
    "./test/stubs-custom-extension/",
    "dist",
    null,
    null,
    eleventyConfig,
  );
  let data = await tmpl.getData();
  t.is(await renderTemplate(tmpl, data), "<p>Paragraph</p>");
});

test("Return undefined in compile to ignore #2267", async (t) => {
  let eleventyConfig = new TemplateConfig();

  // addExtension() API
  eleventyConfig.userConfig.addExtension("txt", {
    compile: function (str, inputPath) {
      return;
    },
  });
  await eleventyConfig.init();

  let tr = await getNewTemplateRender("txt", null, eleventyConfig);
  let fn = await tr.getCompiledTemplate("<p>Paragraph</p>");
  t.is(fn, undefined);
});

test("Simple alias to Markdown Render", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.addExtension("mdx", {
    key: "md",
  });
  await eleventyConfig.init();

  let tr = await getNewTemplateRender("mdx", null, eleventyConfig);

  let fn = await tr.getCompiledTemplate("# Header");
  t.is((await fn()).trim(), "<h1>Header</h1>");
  t.is((await fn({})).trim(), "<h1>Header</h1>");
});

// NOTE: Breaking change in 3.0 `import` does not allow aliasing to non-.js file names
test.skip("Breaking Change (3.0): Simple alias to JavaScript Render", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.addExtension("11ty.custom", {
    key: "11ty.js",
  });
  await eleventyConfig.init();

  let tr = await getNewTemplateRender("./test/stubs/string.11ty.custom", null, eleventyConfig);
  let fn = await tr.getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>Zach</p>");
});

// NOTE: Breaking change in 3.0 `import` does not allow aliasing to non-.js file names
test.skip("Breaking Change (3.0): Override to JavaScript Render", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.addExtension("11ty.custom", {
    key: "11ty.js",
    init: function () {},
  });
  await eleventyConfig.init();

  let tr = await getNewTemplateRender("./test/stubs/string.11ty.custom", null, eleventyConfig);
  let fn = await tr.getCompiledTemplate();
  t.is(await fn({ name: "Bill" }), "<p>Zach</p>");
});

// NOTE: Breaking change in 3.0 `import` does not allow aliasing to non-.js file names
test.skip("Breaking Change (3.0): Two simple aliases to JavaScript Render", async (t) => {
  t.plan(2);
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.addExtension(["11ty.custom", "11ty.possum"], {
    key: "11ty.js", // esm
  });
  await eleventyConfig.init();

  let map = new EleventyExtensionMap([], eleventyConfig); // reuse this

  let tr = await getNewTemplateRender("./test/stubs/string.11ty.custom", null, eleventyConfig, map);
  let fn = await tr.getCompiledTemplate();
  t.is(await fn({}), "<p>Zach</p>");

  let tr2 = await getNewTemplateRender(
    "./test/stubs/string.11ty.possum",
    null,
    eleventyConfig,
    map,
  );
  let fn2 = await tr2.getCompiledTemplate();
  t.is(await fn2({}), "<p>Possum</p>");
});

test("Double override (not aliases) throws an error", async (t) => {
  let eleventyConfig = new TemplateConfig();
  eleventyConfig.userConfig.addExtension(["11ty.custom", "11ty.possum"], {
    key: "11ty.js",
    init: function () {
      t.true(true);
    },
  });

  await eleventyConfig.init();

  let map = new EleventyExtensionMap([], eleventyConfig); // reuse this

  await t.throwsAsync(
    async () => {
      let tr = await getNewTemplateRender(
        "./test/stubs/string.11ty.custom",
        null,
        eleventyConfig,
        map,
      );
      await tr.getCompiledTemplate();
    },
    {
      message:
        'An attempt was made to override the *already* overridden "11ty.js" template syntax via the `addExtension` configuration API. A maximum of one override is currently supported. If you’re trying to add an alias to an existing syntax, make sure only the `key` property is present in the addExtension options object.',
    },
  );
});
