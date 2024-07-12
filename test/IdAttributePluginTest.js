import test from "ava";

import { IdAttributePlugin } from "../src/Plugins/IdAttributePlugin.js";
import Eleventy from "../src/Eleventy.js";

test("Using the transform (and the filter too)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(IdAttributePlugin);

      eleventyConfig.addTemplate("test.njk", `<h1>This is a heading</h1><h2 id="already">This is another heading</h2>`, {});
    },
  });

  elev.disableLogger();

  let results = await elev.toJSON();
	t.is(results[0].content, `<h1 id="this-is-a-heading">This is a heading</h1><h2 id="already">This is another heading</h2>`);
});
