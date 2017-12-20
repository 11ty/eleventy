const slug = require("slug-rfc");

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
    permalink: "permalink"
  },
  dir: {
    input: ".",
    includes: "_includes",
    data: "_data",
    output: "_site"
  },
  handlebarsHelpers: {},
  nunjucksFilters: {
    slug: function(str) {
      return slug(str, {
        lower: true
      });
    }
  }
};
