const urlFilter = require("./Filters/Url");
const slugFilter = require("./Filters/Slug");
const getCollectionItem = require("./Filters/GetCollectionItem");

module.exports = function (config) {
  let eleventyConfig = this;
  config.addFilter("slug", slugFilter);
  config.addFilter("url", function (url, pathPrefixOverride) {
    let pathPrefix =
      pathPrefixOverride || eleventyConfig.getConfig().pathPrefix;
    return urlFilter.call(this, url, pathPrefix);
  });
  config.addFilter("log", console.log);

  config.addFilter("getCollectionItem", (collection, page) =>
    getCollectionItem(collection, page)
  );
  config.addFilter("getPreviousCollectionItem", (collection, page) =>
    getCollectionItem(collection, page, -1)
  );
  config.addFilter("getNextCollectionItem", (collection, page) =>
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
      "11ty.js",
    ],
    // if your site lives in a subdirectory, change this
    pathPrefix: "/",
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dataTemplateEngine: false, // change in 1.0
    htmlOutputSuffix: "-o",
    jsDataFileSuffix: ".11tydata",
    keys: {
      package: "pkg",
      layout: "layout",
      permalink: "permalink",
      permalinkRoot: "permalinkBypassOutputDir",
      engineOverride: "templateEngineOverride",
      computed: "eleventyComputed",
    },
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    // deprecated, use config.addHandlebarsHelper
    handlebarsHelpers: {},
    // deprecated, use config.addNunjucksFilter
    nunjucksFilters: {},
  };
};
