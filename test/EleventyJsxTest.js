import test from "ava";
// Typically import 'tsx/esm'; but we use register method to work with test isolation
import { register } from 'tsx/esm/api'
import { renderToStaticMarkup } from 'react-dom/server';
import Eleventy from "../src/Eleventy.js";

test("Eleventy with JSX", async (t) => {
  register();

  let elev = new Eleventy("./test/stubs-fancyjs/test.11ty.tsx", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
        key: "11ty.js",
        compile: function() {
          return async function(data) {
            let content = await this.defaultRenderer(data);
            return renderToStaticMarkup(content);
          };
        }
      });
    }
  });
  elev.disableLogger();
  elev.setFormats("11ty.tsx");

  let results = await elev.toJSON();
  t.is(results.length, 1);

  t.is(results[0].content, `<div>hello world 1</div>`);
});

test("Eleventy no formats", async (t) => {
  register();

  let elev = new Eleventy("./test/stubs-fancyjs/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
        key: "11ty.js",
        compile: function() {
          return async function(data) {
            let content = await this.defaultRenderer(data);
            return renderToStaticMarkup(content);
          };
        }
      });
    }
  });
  elev.disableLogger();
  // elev.setFormats("")

  let results = await elev.toJSON();
  t.is(results.length, 0);
});

test("Eleventy JSX --formats=11ty.tsx", async (t) => {
  register();

  let elev = new Eleventy("./test/stubs-fancyjs/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
        key: "11ty.js",
        compile: function() {
          return async function(data) {
            let content = await this.defaultRenderer(data);
            return renderToStaticMarkup(content);
          };
        }
      });
    }
  });
  elev.disableLogger();
  elev.setFormats("11ty.tsx")

  let results = await elev.toJSON();
  t.is(results.length, 1);

  t.is(results[0].content, `<div>hello world 1</div>`);
});

test("Eleventy JSX --formats=tsx", async (t) => {
  register();

  let elev = new Eleventy("./test/stubs-fancyjs/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
        key: "11ty.js",
        compile: function() {
          return async function(data) {
            let content = await this.defaultRenderer(data);
            return renderToStaticMarkup(content);
          };
        }
      });
    }
  });
  elev.disableLogger();
  elev.setFormats("tsx"); // should not pick up 11ty.tsx

  let results = await elev.toJSON();
  t.is(results.length, 0); // Should have no results!!
});
