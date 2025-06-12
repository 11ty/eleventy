import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#3860 addCollection consumes `collections` but is missing `collections.all`", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addFilter("keys", obj => Object.keys(obj));
      eleventyConfig.addTemplate("post1.md", "# Post1", { tags: ["bar"]});
      eleventyConfig.addTemplate("post2.md", "# Post2", { tags: ["foo"]});

      eleventyConfig.addTemplate("tag.njk", "{{ collections | keys }}", {
		    pagination: {
		      data: "collections",
		      size: 1,
		      alias: "collection",
		    },
		    permalink: "tag/{{collection}}/index.html",
		    eleventyExcludeFromCollections: true,
		  });
    }
  });

  let results = await elev.toJSON();

  let tagPages = results.filter((entry) => entry.inputPath.endsWith("tag.njk"));
  t.is(tagPages.length, 3);
  t.is(tagPages[0]?.content.trim(), `bar,foo,all`)
  t.is(tagPages[1]?.content.trim(), `bar,foo,all`)
  t.is(tagPages[2]?.content.trim(), `bar,foo,all`)
});
