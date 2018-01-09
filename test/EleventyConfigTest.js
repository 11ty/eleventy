import test from "ava";
import eleventyConfig from "../src/EleventyConfig";

test.cb("Events", t => {
  eleventyConfig.on("testEvent", function(arg1, arg2, arg3) {
    t.is(arg1, "arg1");
    t.is(arg2, "arg2");
    t.is(arg3, "arg3");
    t.end();
  });

  eleventyConfig.emit("testEvent", "arg1", "arg2", "arg3");
});

test("Add Collections", t => {
  eleventyConfig.addCollection("myCollection", function(collection) {});
  t.deepEqual(Object.keys(eleventyConfig.getCollections()), ["myCollection"]);
});
