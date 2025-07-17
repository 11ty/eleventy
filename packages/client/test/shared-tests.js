import { assert, test } from "vitest";
import { Markdown } from "../dist/formats/eleventy-markdown.js";
import { Liquid } from "../dist/formats/eleventy-liquid.js";
import { Nunjucks } from "../dist/formats/eleventy-nunjucks.js";
import { I18nPlugin } from "../dist/plugins/eleventy-plugin-i18n.js";

export default function(Eleventy) {
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

	test("i18n Plugin Use (with 11ty.js)", async () => {
		let elev = new Eleventy({
			config(eleventyConfig) {
				eleventyConfig.addPlugin(I18nPlugin, {
					defaultLanguage: "en"
				});
				eleventyConfig.addTemplate("./en/index.11ty.js", function (data) {
					return `<a href="${this.locale_url("/")}">Home</a>`;
				});
				eleventyConfig.addTemplate("./es/index.11ty.js", function (data) {
					return `<a href="${this.locale_url("/")}">Home</a>`;
				});
			}
		});

		let json = await elev.toJSON();
		assert.strictEqual(json[0].content.trim(), `<a href="/en/">Home</a>`);
		assert.strictEqual(json[1].content.trim(), `<a href="/es/">Home</a>`);
	});

	// Careful, `@11ty/client` will resolve slugify via Vite instead of it bundled with the package
	test("slugify Filter in Liquid", async () => {
		let elev = new Eleventy({
			config(eleventyConfig) {
				eleventyConfig.addEngine("liquid", Liquid);
				eleventyConfig.setTemplateFormats("liquid");
				eleventyConfig.addTemplate("index.liquid", `{{ title | slugify }}`, { title: "This is a heading" });
			}
		});

		let json = await elev.toJSON();
		assert.strictEqual(json[0].content.trim(), `this-is-a-heading`);
	});

	// Careful, `@11ty/client` will resolve slugify via Vite instead of it bundled with the package
	test("slugify Filter in Nunjucks", async () => {
		let elev = new Eleventy({
			config(eleventyConfig) {
				eleventyConfig.addEngine("njk", Nunjucks);
				eleventyConfig.setTemplateFormats("njk");
				eleventyConfig.addTemplate("index.njk", `{{ title | slugify }}`, { title: "This is a heading" });
			}
		});

		let json = await elev.toJSON();
		assert.strictEqual(json[0].content.trim(), `this-is-a-heading`);
	});
}
