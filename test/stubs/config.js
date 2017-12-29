const pretty = require("pretty");

module.exports = {
  markdownTemplateEngine: "ejs",
  templateFormats: ["md", "njk"],
  keys: {
    package: "pkg2"
  },
  filters: {
    prettyHtml: function(str, outputPath) {
      // todo check if HTML output before transforming
      return pretty(str, { ocd: true });
    }
  },
  nunjucksFilters: {
    testing: str => {
      return str;
    }
  }
};
