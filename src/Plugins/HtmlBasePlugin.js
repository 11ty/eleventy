import { DeepCopy } from "@11ty/eleventy-utils";
import urlFilter from "../Filters/Url.js";
import PathPrefixer from "../Util/PathPrefixer.js";
import { HtmlTransformer } from "../Util/HtmlTransformer.js";
import isValidUrl from "../Util/ValidUrl.js";

function addPathPrefixToUrl(url, pathPrefix, base) {
	let u;
	if (base) {
		u = new URL(url, base);
	} else {
		u = new URL(url);
	}

	// Add pathPrefix **after** url is transformed using base
	if (pathPrefix) {
		u.pathname = PathPrefixer.joinUrlParts(pathPrefix, u.pathname);
	}
	return u.toString();
}

// pathprefix is only used when overrideBase is a full URL
function transformUrl(url, base, opts = {}) {
	let { pathPrefix, pageUrl } = opts;

	// full URL, return as-is
	if (isValidUrl(url)) {
		return url;
	}

	// Not a full URL, but with a full base URL
	// e.g. relative urls like "subdir/", "../subdir", "./subdir"
	if (isValidUrl(base)) {
		// convert relative paths to absolute path first using pageUrl
		if (pageUrl && !url.startsWith("/")) {
			let urlObj = new URL(url, `http://example.com${pageUrl}`);
			url = urlObj.pathname + (urlObj.hash || "");
		}

		return addPathPrefixToUrl(url, pathPrefix, base);
	}

	// Not a full URL, nor a full base URL (call the built-in `url` filter)
	return urlFilter(url, base);
}

function eleventyHtmlBasePlugin(eleventyConfig, defaultOptions = {}) {
	let opts = DeepCopy(
		{
			// eleventyConfig.pathPrefix is new in Eleventy 2.0.0-canary.15
			// `base` can be a directory (for path prefix transformations)
			//    OR a full URL with origin and pathname
			baseHref: eleventyConfig.pathPrefix,

			extensions: "html",
		},
		defaultOptions,
	);

	// `filters` option to rename filters was removed in 3.0.0-alpha.13
	// Renaming these would cause issues in other plugins (e.g. RSS)
	if (opts.filters !== undefined) {
		throw new Error(
			"The `filters` option in the HTML Base plugin was removed to prevent future cross-plugin compatibility issues.",
		);
	}

	if (opts.baseHref === undefined) {
		throw new Error("The `base` option is required in the HTML Base plugin.");
	}

	eleventyConfig.addFilter("addPathPrefixToFullUrl", function (url) {
		return addPathPrefixToUrl(url, eleventyConfig.pathPrefix);
	});

	// Apply to one URL
	eleventyConfig.addFilter("htmlBaseUrl", function (url, baseOverride, pageUrlOverride) {
		let base = baseOverride || opts.baseHref;

		// Do nothing with a default base
		if (base === "/") {
			return url;
		}

		return transformUrl(url, base, {
			pathPrefix: eleventyConfig.pathPrefix,
			pageUrl: pageUrlOverride || this.page?.url,
		});
	});

	// Apply to a block of HTML
	eleventyConfig.addAsyncFilter(
		"transformWithHtmlBase",
		function (content, baseOverride, pageUrlOverride) {
			let base = baseOverride || opts.baseHref;

			// Do nothing with a default base
			if (base === "/") {
				return content;
			}

			return HtmlTransformer.transformStandalone(content, (url) => {
				return transformUrl(url.trim(), base, {
					pathPrefix: eleventyConfig.pathPrefix,
					pageUrl: pageUrlOverride || this.page?.url,
				});
			});
		},
	);

	// Apply to all HTML output in your project
	eleventyConfig.htmlTransformer.addUrlTransform(
		opts.extensions,
		function (urlInMarkup) {
			// baseHref override is via renderTransforms filter for adding the absolute URL (e.g. https://example.com/pathPrefix/) for RSS/Atom/JSON feeds
			return transformUrl(urlInMarkup.trim(), this.baseHref || opts.baseHref, {
				pathPrefix: eleventyConfig.pathPrefix,
				pageUrl: this.url,
			});
		},
		{
			priority: -1, // run last (especially after PathToUrl transform)
			enabled: function (context) {
				// Enabled when pathPrefix is non-default or via renderTransforms
				return context.baseHref || opts.baseHref !== "/";
			},
		},
	);
}

Object.defineProperty(eleventyHtmlBasePlugin, "eleventyPackage", {
	value: "@11ty/eleventy/html-base-plugin",
});

Object.defineProperty(eleventyHtmlBasePlugin, "eleventyPluginOptions", {
	value: {
		unique: true,
	},
});

export default eleventyHtmlBasePlugin;
export { transformUrl as applyBaseToUrl };
