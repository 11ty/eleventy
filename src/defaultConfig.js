import Url from "./Filters/Url.js";
import serverlessUrlFilter from "./Filters/ServerlessUrl.js";
import slugFilter from "./Filters/Slug.js";
import slugifyFilter from "./Filters/Slugify.js";
import GetLocaleCollectionItem from "./Filters/GetLocaleCollectionItem.js";
const { call } = Url;
const { call: _call } = GetLocaleCollectionItem;

export default function (config) {
  let templateConfig = this;

  config.addFilter("slug", slugFilter);
  config.addFilter("slugify", slugifyFilter);

  // Add pathPrefix manually to a URL
  config.addFilter("url", function addPathPrefix(url, pathPrefixOverride) {
    let pathPrefix = pathPrefixOverride || templateConfig.getPathPrefix();
    return call(this, url, pathPrefix);
  });

  config.addFilter("log", (input, ...messages) => {
    console.log(input, ...messages);
    return input;
  });

  config.addFilter("serverlessUrl", serverlessUrlFilter);

  config.addFilter(
    "getCollectionItem",
    function (collection, pageOverride, langCode) {
      return _call(this, config, collection, pageOverride, langCode, 0);
    }
  );
  config.addFilter(
    "getPreviousCollectionItem",
    function (collection, pageOverride, langCode) {
      return _call(this, config, collection, pageOverride, langCode, -1);
    }
  );
  config.addFilter(
    "getNextCollectionItem",
    function (collection, pageOverride, langCode) {
      return _call(this, config, collection, pageOverride, langCode, 1);
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
}
