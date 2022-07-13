const urlFilter = require("./Filters/Url");
const serverlessUrlFilter = require("./Filters/ServerlessUrl");
const slugFilter = require("./Filters/Slug");
const slugifyFilter = require("./Filters/Slugify");
const getCollectionItem = require("./Filters/GetCollectionItem");

function getPageInFilter(context, config) {
  // Work with src/Plugins/I18nPlugin.js to retrieve root pages (not i18n pages)
  let localeFilter = config.getFilter("11ty.i18n.getLocaleRootPage");
  if (localeFilter && typeof localeFilter === "function") {
    return localeFilter.call(context);
  }

  let page =
    context.page || context.ctx?.page || context.context?.environments?.page;

  return page;
}

module.exports = function (config) {
  let templateConfig = this;

  config.addFilter("slug", slugFilter);
  config.addFilter("slugify", slugifyFilter);

  config.addFilter("url", function (url, pathPrefixOverride) {
    let pathPrefix = pathPrefixOverride || templateConfig.getPathPrefix();
    return urlFilter.call(this, url, pathPrefix);
  });
  config.addFilter("log", (input, ...messages) => {
    console.log(input, ...messages);
    return input;
  });

  config.addFilter("serverlessUrl", serverlessUrlFilter);

  config.addFilter("getCollectionItem", function (collection, pageOverride) {
    let page = pageOverride || getPageInFilter(this, config);
    return getCollectionItem(collection, page);
  });
  config.addFilter(
    "getPreviousCollectionItem",
    function (collection, pageOverride) {
      let page = pageOverride || getPageInFilter(this, config);
      return getCollectionItem(collection, page, -1);
    }
  );
  config.addFilter(
    "getNextCollectionItem",
    function (collection, pageOverride) {
      let page = pageOverride || getPageInFilter(this, config);
      return getCollectionItem(collection, page, 1);
    }
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
