import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("#3788 Nunjucks shortcodes args", async (t) => {
	let elev = new Eleventy("test/noop", false, {
		config(eleventyConfig) {
			eleventyConfig.addTemplate("index.njk", `{% test %}:{% test "" %}`);

			eleventyConfig.addShortcode("test", (args) => {
				return JSON.stringify(args);
			})
		}
	});

	let [result] = await elev.toJSON();

	t.is(result.content, `undefined:""`);
});
