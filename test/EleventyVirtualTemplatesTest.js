import test from "ava";
import fs from "fs";
import { rimrafSync } from "rimraf";

import Eleventy from "../src/Eleventy.js";
import DuplicatePermalinkOutputError from "../src/Errors/DuplicatePermalinkOutputError.js";

test("Virtual templates, issue #1612", async (t) => {
	let elev = new Eleventy("./test/stubs-virtual-nowrite", "./test/stubs-virtual-nowrite/_site", {
		config: function (eleventyConfig) {
			eleventyConfig.addTemplate("virtual.md", `# Hello`)
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
			eleventyConfig.addTemplate("./virtual.md", `---
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
			eleventyConfig.addTemplate("virtual.md", `# {{ myKey }}`, { myKey: "myValue" })
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
			eleventyConfig.addTemplate("virtual.md", `---
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

test("Virtual template conflicts with file on file system, issue #1612", async (t) => {
	let elev = new Eleventy("./test/stubs/stubs-virtual-conflict", "./test/stubs/stubs-virtual-conflict/_site", {
		config: function (eleventyConfig) {
			eleventyConfig.addTemplate("virtual.md", `# Virtual template`)
		},
	});
	elev.disableLogger();

	await t.throwsAsync(elev.toJSON(), {
		message: `A virtual template had the same path as a file on the file system: "./test/stubs/stubs-virtual-conflict/virtual.md"`
	});
});

test("Virtual templates try to output to the same file, issue #1612", async (t) => {
	let elev = new Eleventy("./test/stubs-virtual-nowrite", "./test/stubs-virtual-nowrite/_site", {
		config: function (eleventyConfig) {
			eleventyConfig.addTemplate("virtual-one.md", "", {
				permalink: "/output.html"
			})
			eleventyConfig.addTemplate("virtual-two.md", "", {
				permalink: "/output.html"
			})
		},
	});
	elev.disableLogger();

	await t.throwsAsync(elev.toJSON(), {
		instanceOf: DuplicatePermalinkOutputError,
	});
});

// Warning: this test writes to the file system
test("Virtual template writes to file system, issue #1612", async (t) => {
	let elev = new Eleventy("./test/stubs-virtual", "./test/stubs-virtual/_site", {
		config: function (eleventyConfig) {
			eleventyConfig.addTemplate("virtual.md", `# Hello`)
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

test("Virtual templates conflict", async (t) => {
	let elev = new Eleventy("./test/stubs-virtual-nowrite", "./test/stubs-virtual-nowrite/_site", {
		config: function (eleventyConfig) {
			eleventyConfig.addTemplate("virtual.md", `# Hello`);
			eleventyConfig.addTemplate("virtual.md", `# Hello`);
		},
	});

	let e = await t.throwsAsync(async () => {
    await elev.toJSON();
	});

	t.is(e.message, "Virtual template conflict: you can’t add multiple virtual templates that have the same inputPath: virtual.md");
});
