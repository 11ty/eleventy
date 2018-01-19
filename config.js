const slugify = require("slugify");

module.exports = function(config) {
  // universal filter
  config.addFilter("slug", str => {
    return slugify(str, {
      replacement: "-",
      lower: true
    });
  });

  return {
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
    passthroughFileCopy: true,
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
    // deprecated, use config.addHandlebarsHelper
    handlebarsHelpers: {},
    // deprecated, use config.addNunjucksFilter
    nunjucksFilters: {}
  };
};
