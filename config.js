const slugify = require("slugify");

module.exports = {
  templateFormats: [
    "liquid",
    "ejs",
    "md",
    "hbs",
    "mustache",
    "haml",
    "pug",
    "njk",
    "html",
    "jstl"
  ],
  markdownTemplateEngine: "liquid",
  htmlTemplateEngine: "liquid",
  dataTemplateEngine: "liquid",
  htmlOutputSuffix: "-o",
  keys: {
    package: "pkg",
    layout: "layout",
    permalink: "permalink",
    permalinkRoot: "permalinkBypassOutputDir"
  },
  dir: {
    input: ".",
    includes: "_includes",
    data: "_data",
    output: "_site"
  },
  filters: {},
  contentMapCollectionFilters: {
    posts: function(collection, activeTemplate) {
      return collection.getFilteredByTag("post", activeTemplate);
    }
  },
  onContentMapped: function(map) {
    // console.log( "Content map", map );
  },
  handlebarsHelpers: {},
  nunjucksFilters: {
    slug: str => {
      return slugify(str, {
        replacement: "-",
        lower: true
      });
    }
  }
};
