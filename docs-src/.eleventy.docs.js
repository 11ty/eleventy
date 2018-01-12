const TemplatePath = require("../src/TemplatePath");
console.log();
module.exports = {
  templateFormats: ["njk"],
  dir: {
    input: "docs-src",
    data: "_data",
    output: "docs"
  },
  nunjucksFilters: {
    removeDir: function(str) {
      return TemplatePath.stripPathFromDir(
        str,
        TemplatePath.normalize(__dirname, "..")
      );
    }
  }
};
