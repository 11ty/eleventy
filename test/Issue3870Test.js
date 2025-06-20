import test from "ava";
import Eleventy from "../src/Eleventy.js";

// This tests Eleventy Watch WITHOUT using the file system!

test("#3870 templateRender has not yet initialized (not incremental)", async (t) => {
  let runs = [
    {
      expected: `[]`,
    },
    {
      expected: `[]`,
    },
  ];

  t.plan(runs.length + 1);

  let index = 0;
  let elev = new Eleventy("test/stubs-virtual/", "test/stubs-virtual/_site", {
    configPath: "test/stubs-virtual/eleventy.config.js",
    config(eleventyConfig) {
      eleventyConfig.addTemplate("search.11ty.js", class {
        data() {
          return {
            permalink: '/search.json',
            // permalink: false,
            layout: false,
            eleventyExcludeFromCollections: true,
          };
        }

        async render(data) {
          return '[]';
        }
      });

      eleventyConfig.on("eleventy.after", ({ results }) => {
        t.is(results[0]?.content, runs[index].expected);
      });
    }
  });

  elev.disableLogger();
  await elev.init();

  let asyncTriggerFn = await elev.watch();

  for(let run of runs) {
    await asyncTriggerFn("test/stubs-virtual/eleventy.config.js");
    index++;
  }

  await elev.stopWatch();
});
