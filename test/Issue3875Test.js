import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#3875 numeric tags", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addFilter("keys", (obj) => Object.keys(obj));
      eleventyConfig.addTemplate("index.njk", "{{ collections | keys }}", {
        tags: [1,2,3]
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, "1,2,3,all");
});

test("#3875 numeric tags (via front matter)", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addFilter("keys", (obj) => Object.keys(obj));
      eleventyConfig.addTemplate("index.njk", `---
tags:
  - 1
  - 2
  - 3
---
{{ collections | keys }}`);
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, "1,2,3,all");
});

test("#3875 consume a numeric tag collection (njk)", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addFilter("keyTypes", (obj) => Object.keys(obj).map(entry => typeof entry).join(","));
      eleventyConfig.addTemplate("child.njk", "", {
        tags: [1]
      });
      eleventyConfig.addTemplate("index.njk", `{{ collections | keyTypes }}:{{ collections[1].length }}:{{ collections['1'].length }}`);
    }
  });

  let results = await elev.toJSON();
  t.is(results.filter(entry => entry.inputPath.endsWith("index.njk"))[0].content, "string,string:1:1");
});

test("#3875 consume a numeric tag collection (liquid)", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addFilter("keyTypes", (obj) => Object.keys(obj).map(entry => typeof entry).join(","));
      eleventyConfig.addTemplate("child.njk", "", {
        tags: [1]
      });
      eleventyConfig.addTemplate("index.liquid", `{{ collections | keyTypes }}:{{ collections[1].length }}:{{ collections['1'].length }}`);
    }
  });

  let results = await elev.toJSON();
  t.is(results.filter(entry => entry.inputPath.endsWith("index.liquid"))[0].content, "string,string:1:1");
});

test("#3875 consume a numeric tag collection (11ty.js)", async (t) => {
  let elev = new Eleventy("test/noop", false, {
    config(eleventyConfig) {
      eleventyConfig.addTemplate("child.njk", "", {
        tags: [1]
      });
      eleventyConfig.addTemplate("index.11ty.js", {
        render(data) {
          return `${Object.keys(data.collections).map(entry => typeof entry).join(",")}:${data.collections[1].length}:${data.collections['1'].length}`
        }
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results.filter(entry => entry.inputPath.endsWith("index.11ty.js"))[0].content, "string,string:1:1");
});
