import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#3825 addCollection consumes tag from pagination template", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addTemplate("post1.md", "# Post1");
      eleventyConfig.addTemplate("post2.md", "# Post2");

      eleventyConfig.addCollection("posts", async collectionApi => {
        return collectionApi.getFilteredByGlob("**/post*.md");
      });

			eleventyConfig.addCollection("myCollection", collectionApi => {
				// populated by child.njk
				return collectionApi.getFilteredByTag("childTag");
			})

      eleventyConfig.addTemplate("child.njk", `---
pagination:
  data: collections.posts
  size: 1
  alias: tag
  filter:
    - all
  addAllPagesToCollections: true
tags: childTag
---
{{ tag }}`);

      eleventyConfig.addTemplate("index.njk", `{{ collections.myCollection.length }}`, {
        // eleventyImport: {
        //   collections: ["myCollection"]
        // }
      });
    }
  });

  let results = await elev.toJSON();
  results.sort();

  t.is(results.length, 5);
  t.is(results.filter((entry) => entry.url === "/")[0]?.content.trim(), "2")
});

test("Side-issue #3825 tried to Reflect.has on a string in pagination", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addTemplate("post1.md", "# Post1");
      eleventyConfig.addTemplate("post2.md", "# Post2");

      eleventyConfig.addCollection("posts", async collectionApi => {
        return collectionApi.getFilteredByGlob("**/post*.md");
      });

			eleventyConfig.addCollection("myCollection", collectionApi => {
				// populated by child.njk
				return collectionApi.getFilteredByTag("someArbitraryTag");
			})

      eleventyConfig.addTemplate("child.njk", `---
pagination:
  data: collections.posts
  size: 1
  alias: tag
  filter:
    - all
  addAllPagesToCollections: true
# Warning: this is tag not the expected tags
tag: someArbitraryTag
---
{{ tag }}`);

      eleventyConfig.addTemplate("index.njk", `{{ collections.myCollection.length }}`);
    }
  });

  let results = await elev.toJSON();
  results.sort();

  t.is(results.length, 5);
  t.is(results.filter((entry) => entry.url === "/")[0]?.content.trim(), "0")
});
