const urlFilter = require("./Filters/Url");
const serverlessUrlFilter = require("./Filters/ServerlessUrl");
const slugFilter = require("./Filters/Slug");
const slugifyFilter = require("./Filters/Slugify");
const getCollectionItem = require("./Filters/GetCollectionItem");

/**
 * @module 11ty/eleventy/defaultConfig
 */

/**
 * @callback addFilter - Register a global filter.
 * @param {string} name - Register a template filter by this name.
 * @param {function} callback - The filter logic.
 */

/**
 * @typedef {Object} config
 * @property {addFilter} addFilter - Register a new global filter.
 */

/**
 * @typedef {Object} defaultConfig
 * @property {Array<string>} templateFormats - An array of accepted template formats.
 * @property {string} [pathPrefix='/'] - The directory under which all output files should be written to.
 * @property {string} [markdownTemplateEngine='liquid'] - Template engine to process markdown files with.
 * @property {string} [htmlTemplateEngine='liquid'] - Template engine to process html files with.
 * @property {boolean} [dataTemplateEngine=false] - Changed in v1.0
 * @property {string} [htmlOutputSuffix='-o']
 * @property {string} [jsDataFileSuffix='.11tydata'] - File suffix for jsData files.
 * @property {Object} keys
 * @property {string} [keys.package='pkg']
 * @property {string} [keys.layout='layout']
 * @property {string} [keys.permalink='permalink']
 * @property {string} [keys.permalinkRoot='permalinkBypassOutputDir']
 * @property {string} [keys.engineOverride='templateEngineOverride']
 * @property {string} [keys.computed='eleventyComputed']
 * @property {Object} dir
 * @property {string} [dir.input='.']
 * @property {string} [dir.includes='_includes']
 * @property {string} [dir.data='_data']
 * @property {string} [dir.output='_site']
 * @deprecated handlebarsHelpers
 * @deprecated nunjucksFilters
 */

/**
 * Default configuration object factory.
 *
 * @param {config} config - Eleventy configuration object.
 * @returns {defaultConfig}
 */
module.exports = function (config) {
  let templateConfig = this;

  config.addFilter("slug", slugFilter);
  config.addFilter("slugify", slugifyFilter);

  config.addFilter("url", function (url, pathPrefixOverride) {
    let pathPrefix = pathPrefixOverride || templateConfig.getPathPrefix();
    return urlFilter.call(this, url, pathPrefix);
  });
  config.addFilter("log", console.log);

  config.addFilter("serverlessUrl", serverlessUrlFilter);

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
