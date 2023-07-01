const urlFilter = require("./Filters/Url");
const serverlessUrlFilter = require("./Filters/ServerlessUrl");
const slugFilter = require("./Filters/Slug");
const slugifyFilter = require("./Filters/Slugify");
const getLocaleCollectionItem = require("./Filters/GetLocaleCollectionItem");
const getCollectionItemIndex = require("./Filters/GetCollectionItemIndex");

module.exports = function (config) {
  let templateConfig = this;

  config.addFilter("slug", slugFilter);
  config.addFilter("slugify", slugifyFilter);

  // Add pathPrefix manually to a URL
  config.addFilter("url", function addPathPrefix(url, pathPrefixOverride) {
    let pathPrefix;
    if (pathPrefixOverride && typeof pathPrefixOverride === "string") {
      pathPrefix = pathPrefixOverride;
    } else {
      pathPrefix = templateConfig.getPathPrefix();
    }

    return urlFilter.call(this, url, pathPrefix);
  });

  config.addFilter("log", (input, ...messages) => {
    console.log(input, ...messages);
    return input;
  });

  config.addFilter("serverlessUrl", serverlessUrlFilter);

  config.addFilter("getCollectionItemIndex", function (collection, pageOverride) {
    return getCollectionItemIndex.call(this, collection, pageOverride);
  });

  config.addFilter("getCollectionItem", function (collection, pageOverride, langCode) {
    return getLocaleCollectionItem.call(this, config, collection, pageOverride, langCode, 0);
  });
  config.addFilter("getPreviousCollectionItem", function (collection, pageOverride, langCode) {
    return getLocaleCollectionItem.call(this, config, collection, pageOverride, langCode, -1);
  });
  config.addFilter("getNextCollectionItem", function (collection, pageOverride, langCode) {
    return getLocaleCollectionItem.call(this, config, collection, pageOverride, langCode, 1);
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
      "11ty.js",
    ],
    // if your site lives in a subdirectory, change this
    pathPrefix: "/",
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    htmlOutputSuffix: "-o",

    // Renamed from `jsDataFileSuffix` in 2.0 (and swapped to an Array)
    // If you remove "" we won’t look for dir/dir.json or file.json
    dataFileSuffixes: [".11tydata", ""],

    // "index" will look for `directory/index.*` directory data files instead of `directory/directory.*`
    dataFileDirBaseNameOverride: false,

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
