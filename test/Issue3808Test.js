import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#3808 addCollection in eleventy.before", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addTemplate("post1.md", "# Post1");
      eleventyConfig.addTemplate("post2.md", "# Post2");
      eleventyConfig.addTemplate("index.njk", "{{ collections.posts.length }}");

      eleventyConfig.on("eleventy.before", async () => {
      // eleventyConfig.on("eleventy.beforeConfig", async (eleventyConfig) => {
        eleventyConfig.addCollection("posts", async collectionApi => {
          return collectionApi.getFilteredByGlob("**/post*.md");
        });
      })
    }
  });

  let result = await elev.toJSON();

  t.is(result.filter((entry) => entry.url === "/")[0]?.content.trim(), "2")
});

// /* broken */
// export default function(eleventyConfig) {
//   eleventyConfig.on("eleventy.before", async () => {
//     eleventyConfig.addCollection("posts", collectionApi => {
//       return collectionApi.getFilteredByGlob("**/post*.md");
//     });
//   })
// }

// /* works */
// export default function(eleventyConfig) {
//   eleventyConfig.on("eleventy.beforeConfig", async (eleventyConfig) => {
//     eleventyConfig.addCollection("posts", collectionApi => {
//       return collectionApi.getFilteredByGlob("**/post*.md");
//     });
//   })
// }

// /* works */
// export default async function(eleventyConfig) {
//   eleventyConfig.addCollection("posts", collectionApi => {
//     return collectionApi.getFilteredByGlob("**/post*.md");
//   });
// }

// /* works */
// export default function(eleventyConfig) {
//   eleventyConfig.addCollection("posts", async collectionApi => {
//     return collectionApi.getFilteredByGlob("**/post*.md");
//   });
// }
