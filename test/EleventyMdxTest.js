import test from "ava";
import {renderToStaticMarkup} from 'react-dom/server'
import {register} from 'node:module';
import Eleventy from "../src/Eleventy.js";

register('@mdx-js/node-loader', import.meta.url);

test("Eleventy with MDX", async (t) => {
  let elev = new Eleventy("./test/stubs-fancyjs/test.mdx", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addExtension("mdx", {
        key: "11ty.js",
        compile: () => {
          return async function(data) {
            let content = await this.defaultRenderer(data);
            return renderToStaticMarkup(content);
          };
        }
      });
    }
  });
  elev.disableLogger();
  elev.setFormats("mdx")

  let results = await elev.toJSON();
  t.is(results.length, 1);

  t.is(results[0].content, `<h1>Hello, World!!!!</h1>`);
});
