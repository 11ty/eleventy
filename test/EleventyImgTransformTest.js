import test from "ava";
import semver from "semver";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

import Eleventy from "../src/Eleventy.js";
import { normalizeNewLines } from "./Util/normalizeNewLines.js";

// Only run in Node 18 or newer
if(semver.gte(semver.coerce(process.version).version, "18.0.0")) {
  test("Default image transform with a single image", async (t) => {
    let elev = new Eleventy("./test/stubs-img-transform/single.md", "./test/stubs-img-transform/_site", {
      config: eleventyConfig => {
        eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
          extensions: "html",
          dryRun: true,
          formats: ["auto"],
          defaultAttributes: {
            loading: "lazy",
            decoding: "async"
          }
        });
      }
    });

    let [result] = await elev.toJSON();
    t.deepEqual(normalizeNewLines(result.content), `<img loading="eager" decoding="async" src="/single/IdthKOzqFA-350.png" alt="it’s a possum" width="350" height="685">`);
  });

  test("Default image transform with multiple images", async (t) => {
    let elev = new Eleventy("./test/stubs-img-transform/multiple.md", "./test/stubs-img-transform/_site", {
      config: eleventyConfig => {
        eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
          extensions: "html",
          dryRun: true,
          formats: ["auto"],
          defaultAttributes: {
            loading: "lazy",
            decoding: "async"
          }
        });
      }
    });

    let [result] = await elev.toJSON();
    t.deepEqual(normalizeNewLines(result.content), `<img loading="eager" decoding="async" src="/multiple/IdthKOzqFA-350.png" alt="it’s a possum" width="350" height="685">
<img loading="lazy" decoding="async" src="/multiple/IdthKOzqFA-350.png" alt="it’s a possum" width="350" height="685">`);
  });

  test("Default image transform with an ignored image", async (t) => {
    let elev = new Eleventy("./test/stubs-img-transform/ignored.md", "./test/stubs-img-transform/_site", {
      config: eleventyConfig => {
        eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
          extensions: "html",
          dryRun: true,
          formats: ["auto"],
          defaultAttributes: {
            loading: "lazy",
            decoding: "async"
          }
        });
      }
    });

    let [result] = await elev.toJSON();
    t.deepEqual(normalizeNewLines(result.content), `<img src="./possum.png" alt="it’s a possum" loading="eager">`);
  });

  test("Missing alt", async (t) => {
    let elev = new Eleventy("./test/stubs-img-transform/missing-alt.md", "./test/stubs-img-transform/_site", {
      config: eleventyConfig => {
        eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
          extensions: "html",
          dryRun: true,
          formats: ["auto"],
        });
      }
    });
    elev.setIsVerbose(false);
    elev.disableLogger();

    await t.throwsAsync(async () => {
      await elev.toJSON();
    });
  });
}

