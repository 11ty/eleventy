import test from "ava";

import { IdAttributePlugin } from "../src/Plugins/IdAttributePlugin.js";
import Eleventy from "../src/Eleventy.js";

test("Using the IdAttribute plugin #3356", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(IdAttributePlugin);

      eleventyConfig.addTemplate("test.njk", `<h1>This is a heading</h1><h2 id="already">This is another heading</h2><h2>This is another heading</h2><h3>This is another heading</h3>`, {});
    },
  });

  elev.disableLogger();

  let results = await elev.toJSON();
	t.is(results[0].content, `<h1 id="this-is-a-heading">This is a heading</h1><h2 id="already">This is another heading</h2><h2 id="this-is-another-heading">This is another heading</h2><h3 id="this-is-another-heading-2">This is another heading</h3>`);
});

test("Using the IdAttribute plugin with escaped quoted text", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(IdAttributePlugin);

      eleventyConfig.addTemplate("test.md", `# This is a \`"heading"\``, {});
    },
  });

  elev.disableLogger();

  let results = await elev.toJSON();
	t.is(results[0].content.trim(), `<h1 id="this-is-a-heading">This is a <code>&quot;heading&quot;</code></h1>`);
});
