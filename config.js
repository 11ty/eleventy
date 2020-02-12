const urlFilter = require("./src/Filters/Url");
const slugFilter = require("./src/Filters/Slug");
const getCollectionItem = require("./src/Filters/GetCollectionItem");

module.exports = function(config) {
  config.addFilter("slug", slugFilter);
  config.addFilter("url", urlFilter);
  config.addFilter("log", console.log);

  config.addLiquidFilter("getCollectionItem", (collection, page) =>
    getCollectionItem(collection, page)
  );
  config.addLiquidFilter("getPreviousCollectionItem", (collection, page) =>
    getCollectionItem(collection, page, -1)
  );
  config.addLiquidFilter("getNextCollectionItem", (collection, page) =>
    getCollectionItem(collection, page, 1)
  );

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
      "jstl",
      "11ty.js"
    ],
    // if your site lives in a subdirectory, change this
    pathPrefix: "/",
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dataTemplateEngine: "liquid",
    passthroughFileCopy: true,
    htmlOutputSuffix: "-o",
    jsDataFileSuffix: ".11tydata",
    keys: {
      package: "pkg",
      layout: "layout",
      permalink: "permalink",
      permalinkRoot: "permalinkBypassOutputDir",
      engineOverride: "templateEngineOverride"
    },
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    // deprecated, use config.addTransform
    filters: {},
    // deprecated, use config.addHandlebarsHelper
    handlebarsHelpers: {},
    // deprecated, use config.addNunjucksFilter
    nunjucksFilters: {}
  };
};
