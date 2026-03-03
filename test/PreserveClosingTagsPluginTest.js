import test from "ava";

import { PreserveClosingTagsPlugin } from "../src/Plugins/PreserveClosingTagsPlugin.js";
import Eleventy from "../src/Eleventy.js";

test("Using the PreserveClosingTagsPlugin plugin (meta off) #3356", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(PreserveClosingTagsPlugin);

      eleventyConfig.addTemplate("test.njk", `<html><meta></html>`, {});
    },
  });

  let results = await elev.toJSON();
	t.is(results[0].content, `<html><meta></html>`);
});

test("Using the PreserveClosingTagsPlugin plugin (meta on) #3356", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(PreserveClosingTagsPlugin, {
        tags: ["meta"]
      });

      eleventyConfig.addTemplate("test.njk", `<html><meta></html>`, {});
    },
  });

  let results = await elev.toJSON();
	t.is(results[0].content, `<html><meta /></html>`);
});

test("Using the PreserveClosingTagsPlugin plugin (meta on, link off) #3356", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(PreserveClosingTagsPlugin, {
        tags: ["meta"]
      });

      eleventyConfig.addTemplate("test.njk", `<html><meta><link></html>`, {});
    },
  });

  let results = await elev.toJSON();
	t.is(results[0].content, `<html><meta /><link></html>`);
});

test("Using the PreserveClosingTagsPlugin plugin (meta on, link on) #3356", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(PreserveClosingTagsPlugin, {
        tags: ["meta", "link"]
      });

      eleventyConfig.addTemplate("test.njk", `<html><meta><link></html>`, {});
    },
  });

  let results = await elev.toJSON();
	t.is(results[0].content, `<html><meta /><link /></html>`);
});

test("Using the PreserveClosingTagsPlugin plugin (meta on, link on, title off) #3356", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/_site", {
    config: function (eleventyConfig) {
      eleventyConfig.addPlugin(PreserveClosingTagsPlugin, {
        tags: ["meta", "link"]
      });

      eleventyConfig.addTemplate("test.njk", `<html><title>My Title</title><meta><link></html>`, {});
    },
  });

  let results = await elev.toJSON();
	t.is(results[0].content, `<html><title>My Title</title><meta /><link /></html>`);
});
