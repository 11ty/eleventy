const path = require("path");
const sass = require("sass");

module.exports = function (eleventyConfig) {
  eleventyConfig.addTemplateFormats("scss");

  eleventyConfig.addExtension("scss", {
    useLayouts: false,

    outputFileExtension: "css", // optional, default: "html"

    compile: function (inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      let dirs = [
        parsed.dir || ".",
        // BRITTLE TEST ALERT: DON’T REUSE THIS CODE
        // it expects the template to be in the project root dir
        path.join(parsed.dir, this.config.dir.includes),
      ];

      let result = sass.compileString(inputContent, {
        loadPaths: dirs,
      });

      return (data) => {
        return result.css;
      };
    },
  });
};
