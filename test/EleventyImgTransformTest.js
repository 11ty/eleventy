import test from "ava";
import Eleventy from "../src/Eleventy.js";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

test("Eleventy, defaults inherit from config", async (t) => {
  let elev = new Eleventy("./test/stubs-img-transform", "./test/stubs-img-transform/_site", {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
				extensions: "html",
				formats: ["auto"],
				defaultAttributes: {
					loading: "lazy",
					decoding: "async"
				}
			});
    }
  });

  let [result] = await elev.toJSON();
	t.deepEqual(result.content.trim(), `<img loading="lazy" decoding="async" src="/IdthKOzqFA-350.png" alt="it’s a possum" width="350" height="685">`);
});
