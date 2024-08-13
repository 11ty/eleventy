import test from "ava";
import Eleventy from "../src/Eleventy.js";

test.skip("#3400: Both a paired and unpaired shortcode.", async (t) => {
  let count = 0;
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: function(eleventyConfig) {
      eleventyConfig.addShortcode("single", function() {
        count++;
      });
      eleventyConfig.addPairedShortcode("single", function() {
        count++;
      });

      eleventyConfig.addTemplate("test.njk", `{% single %}
{% single %}{% endsingle %}`, {});
    }
  });

  let results = await elev.toJSON();
  t.is(count, 2);
});
