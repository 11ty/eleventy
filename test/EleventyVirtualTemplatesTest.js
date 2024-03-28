import test from "ava";
import fs from "fs";
import { rimrafSync } from "rimraf";

import Eleventy from "../src/Eleventy.js";

test("Virtual templates, issue #1612", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual-nowrite", "./test/stubs-virtual-nowrite/_site", {
    config: function (eleventyConfig) {
			eleventyConfig.addTemplate("./test/stubs-virtual-nowrite/virtual.md", `# Hello`)
		},
  });

  let results = await elev.toJSON();

  t.deepEqual(results.length, 1);
  t.deepEqual(results[0].content.trim(), `<h1>Hello</h1>`);
  t.deepEqual(results[0].rawInput, `# Hello`);
});

test("Virtual templates with front matter, issue #1612", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual-nowrite", "./test/stubs-virtual-nowrite/_site", {
    config: function (eleventyConfig) {
			eleventyConfig.addTemplate("./test/stubs-virtual-nowrite/virtual.md", `---
myKey: myValue
---
# {{ myKey }}`)
		},
  });

  let results = await elev.toJSON();

  t.deepEqual(results.length, 1);
  t.deepEqual(results[0].content.trim(), `<h1>myValue</h1>`);
  t.deepEqual(results[0].rawInput, `# {{ myKey }}`);
});

test("Virtual templates with supplemental data, issue #1612", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual-nowrite", "./test/stubs-virtual-nowrite/_site", {
    config: function (eleventyConfig) {
			eleventyConfig.addTemplate("./test/stubs-virtual-nowrite/virtual.md", `# {{ myKey }}`, { myKey: "myValue" })
		},
  });

  let results = await elev.toJSON();

  t.deepEqual(results.length, 1);
  t.deepEqual(results[0].content.trim(), `<h1>myValue</h1>`);
  t.deepEqual(results[0].rawInput, `# {{ myKey }}`);
});

// Supplemental data overrides front matter.
test("Virtual templates with front matter and supplemental data, issue #1612", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual-nowrite", "./test/stubs-virtual-nowrite/_site", {
    config: function (eleventyConfig) {
			eleventyConfig.addTemplate("./test/stubs-virtual-nowrite/virtual.md", `---
myKey1: myValue1
myKey3: myValueFm
---
# {{ myKey1 }}{{ myKey2 }}{{ myKey3 }}`, { myKey2: "myValue2", myKey3: "myValueData" })
		},
  });

  let results = await elev.toJSON();

  t.deepEqual(results.length, 1);
  t.deepEqual(results[0].content.trim(), `<h1>myValue1myValue2myValueData</h1>`);
  t.deepEqual(results[0].rawInput, `# {{ myKey1 }}{{ myKey2 }}{{ myKey3 }}`);
});


// Warning: this test writes to the file system
test("Virtual template writes to file system, issue #1612", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
			eleventyConfig.addTemplate("./test/stubs-virtual/virtual.md", `# Hello`)
		},
  });
  elev.disableLogger();

  let [,results] = await elev.write();

  t.deepEqual(results.length, 1);
  t.deepEqual(results[0].content.trim(), `<h1>Hello</h1>`);
  t.deepEqual(results[0].rawInput, `# Hello`);
	t.true(fs.existsSync("./test/stubs-virtual/_site/virtual/index.html"));

	rimrafSync("./test/stubs-virtual/_site/");
});
