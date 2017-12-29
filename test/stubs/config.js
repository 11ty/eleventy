module.exports = {
  markdownTemplateEngine: "ejs",
  templateFormats: ["md", "njk"],
  keys: {
    package: "pkg2"
  },
  nunjucksFilters: {
    testing: str => {
      return str;
    }
  }
};
