import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#3823 addCollection -> pagination over `collections`", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addTemplate("post1.md", "# Post1");
      eleventyConfig.addTemplate("post2.md", "# Post2");
      eleventyConfig.addTemplate("index.njk", `---
pagination:
  data: collections
  size: 1
  alias: tag
  filter:
    - all
  addAllPagesToCollections: true
---
{{ tag }}`);

      eleventyConfig.addCollection("posts", async collectionApi => {
        return collectionApi.getFilteredByGlob("**/post*.md");
      });
    }
  });

  let results = await elev.toJSON();
  results.sort();

  t.is(results.length, 3);
  t.is(results.filter((entry) => entry.url === "/")[0]?.content.trim(), "posts")
});
