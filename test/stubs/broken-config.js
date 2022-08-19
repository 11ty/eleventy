import missingModule from "this-is-a-module-that-does-not-exist";

export default function (eleventyConfig) {
  eleventyConfig.addFilter("cssmin", function (code) {
    return missingModule(code);
  });

  return {};
}
