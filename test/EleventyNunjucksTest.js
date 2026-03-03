import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("Paired shortcodes in macros #2261 #1749", async (t) => {
	let elev = new Eleventy({
		input: "./test/stubs-2261/",
		configPath: "./test/stubs-2261/eleventy.config.js",
	});

	let results = await elev.toJSON();
	t.is(results.length, 1);
	t.is(results[0].content.trim(), `<div>HelloHello Manuel</div>`);
});
