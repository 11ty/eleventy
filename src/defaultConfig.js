import urlFilter from "./Filters/Url.js";
import slugFilter from "./Filters/Slug.js";
import slugifyFilter from "./Filters/Slugify.js";
import getLocaleCollectionItem from "./Filters/GetLocaleCollectionItem.js";
import getCollectionItemIndex from "./Filters/GetCollectionItemIndex.js";
import { FilterPlugin as InputPathToUrlFilterPlugin } from "./Plugins/InputPathToUrl.js";
import { HtmlTransformer } from "./Util/HtmlTransformer.js";

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
export default function (config) {
	let templateConfig = this;

	config.addFilter("slug", slugFilter);
	config.addFilter("slugify", slugifyFilter);

	// Deprecated, use HtmlBasePlugin instead.
	// Adds a pathPrefix manually to a URL string
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

	// Filter: Maps an input path to output URL
	config.addPlugin(InputPathToUrlFilterPlugin, {
		immediate: true,
	});

	// Used for the HTML <base> and InputPathToUrl plugins
	let ut = new HtmlTransformer();
	config.htmlTransformer = ut;
	config.addTransform("eleventy.htmlTransformer", async function (content) {
		return ut.transformContent(this.outputPath, content, this);
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
