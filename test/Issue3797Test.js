import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#3797 Virtual templates with empty includes", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.setIncludesDirectory("");
      eleventyConfig.setLayoutsDirectory("_layouts");
      eleventyConfig.addTemplate("post1.md", "# Post1", { layout: "layout.html" });
      eleventyConfig.addTemplate("_layouts/layout.html", "{{ content }}");
    }
  });

  let [result] = await elev.toJSON();

  t.truthy(result);
});
