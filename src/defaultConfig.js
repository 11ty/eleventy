import extendedDefaultConfig from "./Adapters/Configuration/getExtendedDefaultConfig.js";
import urlFilter from "./Filters/Url.js";
import slugifyFilter from "./Adapters/Configuration/Filters/Slugify.js";
import getLocaleCollectionItem from "./Filters/GetLocaleCollectionItem.js";
import getCollectionItemIndex from "./Filters/GetCollectionItemIndex.js";
import { FilterPlugin as InputPathToUrlFilterPlugin } from "./Plugins/InputPathToUrl.js";

import TransformsUtil from "./Util/TransformsUtil.js";
import MemoizeUtil from "./Util/MemoizeFunction.js";

/**
 * @module 11ty/eleventy/defaultConfig
 */

/**
 * @callback addFilter - Register a global filter.
 * @param {string} name - Register a template filter by this name.
 * @param {function} callback - The filter logic.
 */

/**
 * @typedef {object} config
 * @property {addFilter} addFilter - Register a new global filter.
 * @property {addPlugin} addPlugin - Execute or defer a plugin’s execution.
 * @property {addTransform} addTransform - Add an Eleventy transform to postprocess template output
 * @property {htmlTransformer} htmlTransformer - HTML modification API
 */

/**
 * @typedef {object} defaultConfig
 * @property {Array<string>} templateFormats - An array of accepted template formats.
 * @property {Array<string>} dataFileSuffixes - Array of file suffixes for data files in the Data Cascade.
 * @property {boolean} [dataFileDirBaseNameOverride=false] - Use index.* instead of dirname.* for Directory Data File names
 * @property {string} [pathPrefix='/'] - The directory under which all output files should be written to.
 * @property {string} [markdownTemplateEngine='liquid'] - Template engine to process markdown files with.
 * @property {string} [htmlTemplateEngine='liquid'] - Template engine to process html files with.
 * @property {boolean} [dataTemplateEngine=false] - Changed in v1.0
 * @property {string} [jsDataFileSuffix='.11tydata'] - File suffix for jsData files.
 * @property {object} keys
 * @property {string} [keys.package='pkg'] - Global data property for package.json data
 * @property {string} [keys.layout='layout']
 * @property {string} [keys.permalink='permalink']
 * @property {string} [keys.permalinkRoot='permalinkBypassOutputDir']
 * @property {string} [keys.engineOverride='templateEngineOverride']
 * @property {string} [keys.computed='eleventyComputed']
 * @property {string} [keys.dataSchema='eleventyDataSchema']
 * @property {object} dir
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

	// add extended config (not available in minimal bundle)
	extendedDefaultConfig(config);

	// Filter: Maps an input path to output URL
	config.addPlugin(InputPathToUrlFilterPlugin, {
		immediate: true,
	});

	config.addFilter("slug", function () {
		throw new Error(
			"The `slug` filter (deprecated since v1) has been removed in Eleventy v4. You can add it manually to your configuration file for backwards compatibility, read more at GitHub Issue #3893: https://github.com/11ty/eleventy/issues/3893 Alternatively (more risky), you can swap to use the `slugify` filter instead (outputs may be different and production URLs may break!)",
		);
	});

	let memoizeBench = config.benchmarkManager.get("Configuration");
	config.addFilter("slugify", MemoizeUtil(slugifyFilter, { name: "slugify", bench: memoizeBench }));

	// Deprecated, use HtmlBasePlugin instead.
	// Adds a pathPrefix manually to a URL string
	config.addFilter("url", function addPathPrefixFilter(url, pathPrefixOverride) {
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

	// Process arbitrary content with transforms
	config.addFilter(
		"renderTransforms",
		async function transformsFilter(content, pageEntryOverride, baseHrefOverride) {
			return TransformsUtil.runAll(content, pageEntryOverride || this.page, config.transforms, {
				baseHrefOverride,
				logger: config.logger,
			});
		},
	);

	return {
		templateFormats: ["liquid", "md", "njk", "html", "11ty.js"],
		// if your site deploys to a subdirectory, change this
		pathPrefix: "/",
		markdownTemplateEngine: "liquid",
		htmlTemplateEngine: "liquid",

		// Renamed from `jsDataFileSuffix` in 2.0 (and swapped to an Array)
		// If you remove "" we won’t look for dir/dir.json or file.json
		dataFileSuffixes: [".11tydata", ""],

		// "index" will look for `directory/index.*` directory data files instead of `directory/directory.*`
		dataFileDirBaseNameOverride: false,

		keys: {
			// TODO breaking: use `false` by default
			package: "pkg", // supports `false`
			layout: "layout",
			permalink: "permalink",
			permalinkRoot: "permalinkBypassOutputDir",
			engineOverride: "templateEngineOverride",
			computed: "eleventyComputed",
			dataSchema: "eleventyDataSchema",
		},

		// Deprecated, define using `export const directories = {}` instead.
		// Reference values using `eleventyConfig.directories` instead.
		dir: {
			// These values here aren’t used internally either (except by a few tests), instead we’re using `ProjectDirectories.defaults`.
			// These are kept in place for backwards compat with `eleventyConfig.dir` references in project config code and plugins.
			input: ".",
			includes: "_includes",
			data: "_data",
			output: "_site",
		},

		// deprecated, use config.addNunjucksFilter
		nunjucksFilters: {},
	};
}
