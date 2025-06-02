import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#434 Using `with context` to access collections", async (t) => {
	let elev = new Eleventy("test/noop", false, {
		config(eleventyConfig) {
			eleventyConfig.setIncludesDirectory("../stubs-434/_includes/");
			eleventyConfig.addTemplate("index.njk", `{% import "macros.njk" as forms with context %}{{ forms.label('test') }}`);
		}
	});


	let [result] = await elev.toJSON();
	t.is(result.content, "<label>test:1:/</label>");
});

test("#434 (not ideal) Filters in macros cannot access global data", async (t) => {
	let elev = new Eleventy("test/noop", false, {
		config(eleventyConfig) {
			eleventyConfig.setIncludesDirectory("../stubs-434/_includes/");

      // This doesn’t work to fetch collections from macros
			eleventyConfig.addFilter("getCollection", function(name) {
				return this.collections?.[name] ||
					this.ctx?.collections?.[name] ||
					this.context?.environments?.collections?.[name];
			});

			eleventyConfig.addTemplate("index.njk", `{% import "macros-filter.njk" as forms %}{{ forms.label('test') }}`);
		}
	});


	let [result] = await elev.toJSON();
	t.is(result.content, "<label>test:0</label>");
});
