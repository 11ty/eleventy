import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#188: Content preprocessing (dot in file extension)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPreprocessor("drafts", ".njk", (data, content) => {
        if(data.draft) {
          return false;
        }
        return `Hello ${content}`;
      });

      eleventyConfig.addTemplate("index.njk", "Before");
      eleventyConfig.addTemplate("draft.njk", "Before", { draft: true });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].content, `Hello Before`);
});

test("#188: Content preprocessing (no dot in file extension)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPreprocessor("drafts", "njk", (data, content) => {
        if(data.draft) {
          return false;
        }
        return `Hello ${content}`;
      });

      eleventyConfig.addTemplate("index.njk", "Before");
      eleventyConfig.addTemplate("draft.njk", "Before", { draft: true });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].content, `Hello Before`);
});


test("#188: Content preprocessing (array, no dot in file extension)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPreprocessor("drafts", ["njk"], (data, content) => {
        if(data.draft) {
          return false;
        }
        return `Hello ${content}`;
      });

      eleventyConfig.addTemplate("index.njk", "Before");
      eleventyConfig.addTemplate("draft.njk", "Before", { draft: true });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].content, `Hello Before`);
});

test("#188: Content preprocessing (array, dot in file extension)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPreprocessor("drafts", [".njk"], (data, content) => {
        if(data.draft) {
          return false;
        }
        return `Hello ${content}`;
      });

      eleventyConfig.addTemplate("index.njk", "Before");
      eleventyConfig.addTemplate("draft.njk", "Before", { draft: true });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].content, `Hello Before`);
});

test("#188: Content preprocessing (wildcard)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPreprocessor("drafts", "*", (data, content) => {
        if(data.draft) {
          return false;
        }
        return `Hello ${content}`;
      });

      eleventyConfig.addTemplate("index.njk", "Before");
      eleventyConfig.addTemplate("draft.njk", "Before", { draft: true });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].content, `Hello Before`);
});
