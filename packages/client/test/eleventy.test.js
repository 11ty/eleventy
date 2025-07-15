import { assert, test } from "vitest";
import { Eleventy } from "../dist/eleventy.js";
import { Markdown } from "../dist/eleventy-markdown.js";
import { Liquid } from "../dist/eleventy-liquid.js";
import { Nunjucks } from "../dist/eleventy-nunjucks.js";

test("Get version number", async () => {
  assert.typeOf(Eleventy.getVersion(), "string");
});


test("Markdown (no preprocessor) template", async () => {
  let elev = new Eleventy({
		config(eleventyConfig) {
			eleventyConfig.addEngine("md", Markdown);
			eleventyConfig.setMarkdownTemplateEngine(false);
			eleventyConfig.setHtmlTemplateEngine(false);
			eleventyConfig.setTemplateFormats("md");
			eleventyConfig.addTemplate("index.md", `# Heading`);

		}
	});

	let json = await elev.toJSON();
	assert.strictEqual(json[0].content.trim(), `<h1>Heading</h1>`);
});

test("Markdown (via Liquid) template", async () => {
  let elev = new Eleventy({
		config(eleventyConfig) {
			eleventyConfig.addEngine("md", Markdown);
			eleventyConfig.addEngine("liquid", Liquid);
			eleventyConfig.setTemplateFormats("md");
			eleventyConfig.addTemplate("index.md", `# {{ title }}`, {
				title: "Heading"
			});

		}
	});

	let json = await elev.toJSON();
	assert.strictEqual(json[0].content.trim(), `<h1>Heading</h1>`);
});

test("Liquid template", async () => {
  let elev = new Eleventy({
		config(eleventyConfig) {
			eleventyConfig.addEngine("liquid", Liquid);
			eleventyConfig.setTemplateFormats("liquid");
			eleventyConfig.addTemplate("index.liquid", `<h1>{{ title }}</h1>`, { title: "Heading" });
		}
	});

	let json = await elev.toJSON();
	assert.strictEqual(json[0].content.trim(), `<h1>Heading</h1>`);
});

test("Nunjucks template", async () => {
  let elev = new Eleventy({
		config(eleventyConfig) {
			eleventyConfig.addEngine("njk", Nunjucks);
			eleventyConfig.setTemplateFormats("njk");
			eleventyConfig.addTemplate("index.njk", `<h1>{{ title }}</h1>`, { title: "Heading" });

		}
	});

	let json = await elev.toJSON();
	assert.strictEqual(json[0].content.trim(), `<h1>Heading</h1>`);
});
