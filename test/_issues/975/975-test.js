import test from "ava";

import TemplateMap from "../../../src/TemplateMap.js";
import getNewTemplateForTests from "../../_getNewTemplateForTests.js";
import { getTemplateConfigInstance } from "../../_testHelpers.js";

function getNewTemplate(filename, input, output, eleventyConfig) {
  return getNewTemplateForTests(filename, input, output, null, null, eleventyConfig);
}

test("Get ordered list of templates", async (t) => {
  let eleventyConfig = await getTemplateConfigInstance({
		dir: {
			input: "test/_issues/975/",
			output: "test/_issues/975/_site",
		}
	});

  let tm = new TemplateMap(eleventyConfig);

  // These two templates are add-order-dependent
  await tm.add(
    await getNewTemplate(
      "./test/_issues/975/post.md",
      "./test/_issues/975/",
      "./test/_issues/975/_site",
      eleventyConfig
    )
  );

  await tm.add(
    await getNewTemplate(
      "./test/_issues/975/another-post.md",
      "./test/_issues/975/",
      "./test/_issues/975/_site",
      eleventyConfig
    )
  );

  // This template should always be last
  await tm.add(
    await getNewTemplate(
      "./test/_issues/975/index.md",
      "./test/_issues/975/",
      "./test/_issues/975/_site",
      eleventyConfig
    )
  );

  let order = tm.getOrderedInputPaths(...tm.getFullTemplateMapOrder());
  t.deepEqual(order, [
    "./test/_issues/975/post.md",
    "./test/_issues/975/another-post.md",
    "./test/_issues/975/index.md",
  ]);
});

test("Get ordered list of templates (reverse add)", async (t) => {
	let eleventyConfig = await getTemplateConfigInstance({
		dir: {
			input: "test/_issues/975/",
			output: "test/_issues/975/_site",
		}
	});

  let tm = new TemplateMap(eleventyConfig);

  // This template should always be last
  await tm.add(
    await getNewTemplate(
      "./test/_issues/975/index.md",
      "./test/_issues/975/",
      "./test/_issues/975/_site",
      eleventyConfig
    )
  );

  // These two templates are add-order-dependent
  await tm.add(
    await getNewTemplate(
      "./test/_issues/975/another-post.md",
      "./test/_issues/975/",
      "./test/_issues/975/_site",
      eleventyConfig
    )
  );

  await tm.add(
    await getNewTemplate(
      "./test/_issues/975/post.md",
      "./test/_issues/975/",
      "./test/_issues/975/_site",
      eleventyConfig
    )
  );

  let order = tm.getOrderedInputPaths(...tm.getFullTemplateMapOrder());
  t.deepEqual(order, [
    "./test/_issues/975/another-post.md",
    "./test/_issues/975/post.md",
    "./test/_issues/975/index.md",
  ]);
});
