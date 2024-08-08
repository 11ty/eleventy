import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("Custom Front Matter Parsing Options (using JavaScript node-retrieve-globals)", async (t) => {
  let elev = new Eleventy("./test/stubs/script-frontmatter/test.njk", "./_site");
  elev.disableLogger();

  let result = await elev.toJSON();

  t.deepEqual(result.length, 1);

  t.is(result[0]?.content, `<div>Hi</div><div>Bye</div>`);
});

test("Custom Front Matter Parsing Options (using JavaScript node-retrieve-globals), override project-wide front matter default.", async (t) => {
  let elev = new Eleventy("./test/stubs/script-frontmatter/test-default.njk", "./_site", {
    config: (eleventyConfig) => {
      eleventyConfig.setFrontMatterParsingOptions({
        language: "js",
      });
    },
  });
  elev.disableLogger();

  let result = await elev.toJSON();

  t.deepEqual(result.length, 1);

  t.is(result[0]?.content, `<div>Hi</div><div>Bye</div>`);
});

test("Custom Front Matter Parsing Options (using backwards-compatible `js` instead of node-retrieve-globals)", async (t) => {
  let elev = new Eleventy("./test/stubs/script-frontmatter/test-js.njk", "./_site");
  elev.disableLogger();

  let result = await elev.toJSON();

  t.deepEqual(result.length, 1);

  t.is(result[0]?.content, `<div>HELLO!</div>`);
});
