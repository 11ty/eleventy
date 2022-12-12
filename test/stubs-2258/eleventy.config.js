const path = require("path");
const sass = require("sass");

module.exports = function (eleventyConfig) {
  eleventyConfig.addTemplateFormats("scss");

  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css", // optional, default: "html"

    compile: function (inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      let dirs = [
        parsed.dir || ".",
        // DON’T REUSE THIS, it expects the template to be in the project root dir
        path.join(parsed.dir, this.config.dir.includes),
      ];

      let result = sass.compileString(inputContent, {
        loadPaths: dirs,
      });

      let dependencies = result.loadedUrls
        .filter((dep) => dep.protocol === "file:")
        .map((entry) => entry.pathname);
      this.addDependencies(inputPath, dependencies);

      return (data) => {
        return result.css;
      };
    },
  });
};
