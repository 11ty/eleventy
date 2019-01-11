const TemplatePath = require("../src/TemplatePath");

module.exports = {
  templateFormats: ["njk"],
  dir: {
    input: "docs-src",
    data: "_data",
    output: "docs"
  },
  nunjucksFilters: {
    removeDir: function(str) {
      return TemplatePath.stripLeadingSubPath(
        str,
        TemplatePath.join(__dirname, "..")
      );
    }
  }
};
