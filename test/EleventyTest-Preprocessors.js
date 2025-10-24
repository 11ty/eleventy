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


test("addPreprocessor with 11ty.js, Issue #3433", async (t) => {
  t.plan(5);

  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPreprocessor("testing", "11ty.js", (data, content) => {
        t.is( typeof content, "function" );
        t.is(content(), "Hello!");

        return {
          render: function() {
            return "naw";
          }
        };
      });

      eleventyConfig.addTemplate("template.11ty.js", function() {
        return "Hello!"
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].url, `/template/`);
  t.is(results[0].content.trim(), `naw`);
});


test("addPreprocessor and addExtension, Issue #3433", async (t) => {
  t.plan(5);

  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addTemplateFormats("11ty.test");
      eleventyConfig.addExtension("11ty.test", {
        key: "11ty.js",
      });

      eleventyConfig.addPreprocessor("testing", "11ty.test", (data, content) => {
        t.is( typeof content, "function" );
        t.is(content(), "Hello!");

        return {
          render: function() {
            return "naw";
          }
        };
      });

      eleventyConfig.addTemplate("template.11ty.test", function() {
        return "Hello!"
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].url, `/template/`);
  t.is(results[0].content.trim(), `naw`);
});

test("addPreprocessor and addExtension with custom `compile` (defaultRenderer), Issue #3433", async (t) => {
  t.plan(5);

  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addTemplateFormats("11ty.test");
      eleventyConfig.addExtension("11ty.test", {
        key: "11ty.js",
        compile: function() {
          return this.defaultRenderer;
        }
      });

      eleventyConfig.addPreprocessor("testing", "11ty.test", (data, content) => {
        t.is( typeof content, "function" );
        t.is(content(), "Hello!");

        return {
          render: function() {
            return "naw";
          }
        };
      });

      eleventyConfig.addTemplate("template.11ty.test", function() {
        return "Hello!"
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].url, `/template/`);
  t.is(results[0].content.trim(), `naw`);
});

test("addPreprocessor and addExtension with custom `compile` (re-use render function directly), Issue #3433", async (t) => {
  t.plan(5);

  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addTemplateFormats("11ty.test");
      eleventyConfig.addExtension("11ty.test", {
        key: "11ty.js",
        compile: function(content) {
          return function() {
            return content.render();
          }
        }
      });

      eleventyConfig.addPreprocessor("testing", "11ty.test", (data, content) => {
        t.is( typeof content, "function" );
        t.is(content(), "Hello!");

        return {
          render: function() {
            return "naw";
          }
        };
      });

      eleventyConfig.addTemplate("template.11ty.test", function() {
        return "Hello!"
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].url, `/template/`);
  t.is(results[0].content.trim(), `naw`);
});

test("addPreprocessor and addExtension with custom `compile` (new render function), Issue #3433", async (t) => {
  t.plan(7);

  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addTemplateFormats("11ty.test");
      eleventyConfig.addExtension("11ty.test", {
        key: "11ty.js",
        compile: function(content) {
          // check preprocessor override
          t.is( typeof content.render, "function" );
          t.is(content.render(), "Preprocessor override");

          return function() {
            return "Compiled content";
          }
        }
      });

      eleventyConfig.addPreprocessor("testing", "11ty.test", (data, content) => {
        // check template content directly
        t.is( typeof content, "function" );
        t.is(content(), "Original template content");

        return {
          render: function() {
            return "Preprocessor override";
          }
        };
      });

      eleventyConfig.addTemplate("template.11ty.test", function() {
        return "Original template content"
      });
    }
  });

  let results = await elev.toJSON();
  t.is(results.length, 1);
  t.is(results[0].url, `/template/`);
  t.is(results[0].content.trim(), `Compiled content`);
});

// #3933
test("Tags in pages excluded with preprocessing should not populate collections props", async (t) => {
  let preprocessorRuns = 0;
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPreprocessor("drafts", "njk", (data, content) => {
        preprocessorRuns++;
        if(data.draft) {
          return false;
        }
        return `Hello ${content}`;
      });

      eleventyConfig.addTemplate("paged.njk", "{{ tag }}", {
        pagination: {
          data: "collections",
          size: 1,
          alias: "tag",
          filter: ["all"],
        },
        permalink: "/{{ tag }}/"
      });
      eleventyConfig.addTemplate("source.njk", "Before", { tags: ["yep"] });
      eleventyConfig.addTemplate("source-draft.njk", "Before", { draft: true, tags: ["nope"] });
    }
  });

  let results = await elev.toJSON();
  t.is(preprocessorRuns, 3);
  t.is(results.length, 2);
  t.truthy(results.find(entry => entry.inputPath.endsWith("source.njk")));
  t.falsy(results.find(entry => entry.inputPath.endsWith("source-draft.njk")));

  let pages = results.filter(entry => entry.inputPath.endsWith("paged.njk"));
  t.is(pages.length, 1);
  t.is(pages[0].content, "Hello yep");
});
