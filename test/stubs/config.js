module.exports = {
  markdownTemplateEngine: "ejs",
  templateFormats: ["md", "njk"],
  nunjucksFilters: {
    testing: str => {
      return str;
    }
  }
};
