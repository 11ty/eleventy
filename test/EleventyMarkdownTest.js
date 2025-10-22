import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("Markdown in markdown #3954", async (t) => {
  let elev = new Eleventy({
    input: "./test/stubs-virtual/",
    config: eleventyConfig => {
      eleventyConfig.addTemplate("_includes/layout.md", `{{ content }}`);
      eleventyConfig.addTemplate("index.md", `---
layout: layout.md
---
#  Heading

\`\`\`
# This is code

# This is another code
\`\`\``);
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].content.trim(), `<h1>Heading</h1>
<pre><code># This is code

# This is another code
</code></pre>`);
});
