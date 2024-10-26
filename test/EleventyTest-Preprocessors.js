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
