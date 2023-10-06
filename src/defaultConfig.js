import urlFilter from "./Filters/Url.js";
import slugFilter from "./Filters/Slug.js";
import slugifyFilter from "./Filters/Slugify.js";
import getLocaleCollectionItem from "./Filters/GetLocaleCollectionItem.js";
import getCollectionItemIndex from "./Filters/GetCollectionItemIndex.js";

export default function (config) {
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
    templateFormats: ["liquid", "md", "njk", "html", "11ty.js"],
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
    // deprecated, use config.addNunjucksFilter
    nunjucksFilters: {},
  };
}
