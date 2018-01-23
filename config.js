const slugify = require("slugify");
const TemplatePath = require("./src/TemplatePath");

module.exports = function(config) {
  config.addFilter("slug", str => {
    return slugify(str, {
      replacement: "-",
      lower: true
    });
  });

  config.addFilter("url", function(url, pathPrefix) {
    if (!pathPrefix || typeof pathPrefix !== "string") {
      let projectConfig = require("./src/Config").getConfig();
      pathPrefix = projectConfig.pathPrefix;
    }

    let normUrl = TemplatePath.normalize(url);
    let normRootDir = TemplatePath.normalize("/", pathPrefix);
    let normFull = TemplatePath.normalize("/", pathPrefix, url);

    // minor difference with straight `normalize`, "" resolves to root dir and not "."
    // minor difference with straight `normalize`, "/" resolves to root dir
    if (!url || normUrl === "/" || normUrl === normRootDir) {
      return (
        normRootDir +
        (normRootDir.length &&
        normRootDir.charAt(normRootDir.length - 1) !== "/"
          ? "/"
          : "")
      );
    } else if (
      url === ".." ||
      url.indexOf("../") === 0 ||
      url === "." ||
      url.indexOf("./") === 0
    ) {
      return normUrl;
    }

    return normFull;
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
    pathPrefix: "/",
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
