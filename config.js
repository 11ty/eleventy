const slugify = require("slugify");
const TemplatePath = require("./src/TemplatePath");

module.exports = function(config) {
  // universal filter
  config.addFilter("slug", str => {
    return slugify(str, {
      replacement: "-",
      lower: true
    });
  });

  config.addFilter("url", function(url, urlPrefix) {
    if (!urlPrefix || typeof urlPrefix !== "string") {
      let projectConfig = require("./src/Config").getConfig();
      urlPrefix = projectConfig.urlPrefix;
    }

    let rootDir = urlPrefix;

    if (!url || url === rootDir) {
      return TemplatePath.normalize(rootDir);
      // absolute or relative url
    } else if (url.charAt(0) === "/" || url.indexOf("../") === 0) {
      return TemplatePath.normalize(url);
    }

    return TemplatePath.normalize(rootDir, url);
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
    // if your site lives in a subdirectory, change this
    urlPrefix: "/",
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
