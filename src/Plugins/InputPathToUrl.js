import { TemplatePath } from "@11ty/eleventy-utils";
import isValidUrl from "../Util/ValidUrl.js";
import memoize from "../Util/MemoizeFunction.js";

function normalizeInputPath(inputPath, inputDir, contentMap) {
	// inputDir is optional at the beginning of the developer supplied-path

	let normalized;
	// Input directory already on the input path
	if (TemplatePath.join(inputPath).startsWith(TemplatePath.join(inputDir))) {
		normalized = inputPath;
	} else {
		normalized = TemplatePath.join(inputDir, inputPath);
	}

	normalized = TemplatePath.addLeadingDotSlash(normalized);

	// it must exist in the content map to be valid
	if (contentMap[normalized]) {
		return normalized;
	}

	// the transform may have sent in a URL so we just return it as-is
	return inputPath;
}

function parseFilePath(filepath) {
	try {
		/* u: URL {
			href: 'file:///tmpl.njk#anchor',
			origin: 'null',
			protocol: 'file:',
			username: '',
			password: '',
			host: '',
			hostname: '',
			port: '',
			pathname: '/tmpl.njk',
			search: '',
			searchParams: URLSearchParams {},
			hash: '#anchor'
		} */

		// Note that `node:url` -> pathToFileURL creates an absolute path, which we don’t want
		// URL(`file:#anchor`) gives back a pathname of `/`
		let u = new URL(`file:${filepath}`);
		filepath = filepath.replace(u.search, "");
		filepath = filepath.replace(u.hash, "");

		return [
			// search includes ?, hash includes #
			u.search + u.hash,
			filepath,
		];
	} catch (e) {
		return ["", filepath];
	}
}

function FilterPlugin(eleventyConfig) {
	let contentMap;
	eleventyConfig.on("eleventy.contentMap", function ({ inputPathToUrl }) {
		contentMap = inputPathToUrl;
	});

	eleventyConfig.addFilter(
		"inputPathToUrl",
		memoize(function (filepath) {
			if (!contentMap) {
				throw new Error("Internal error: contentMap not available for `inputPathToUrl` filter.");
			}

			if (isValidUrl(filepath)) {
				return filepath;
			}

			let inputDir = eleventyConfig.directories.input;
			let suffix = "";
			[suffix, filepath] = parseFilePath(filepath);
			filepath = normalizeInputPath(filepath, inputDir, contentMap);

			let urls = contentMap[filepath];
			if (!urls || urls.length === 0) {
				throw new Error("`inputPathToUrl` filter could not find a matching target for " + filepath);
			}

			return `${urls[0]}${suffix}`;
		}),
	);
}

function TransformPlugin(eleventyConfig, defaultOptions = {}) {
	let opts = Object.assign(
		{
			extensions: "html",
		},
		defaultOptions,
	);

	let contentMap = null;
	eleventyConfig.on("eleventy.contentMap", function ({ inputPathToUrl }) {
		contentMap = inputPathToUrl;
	});

	eleventyConfig.htmlTransformer.addUrlTransform(opts.extensions, function (filepathOrUrl) {
		if (!contentMap) {
			throw new Error("Internal error: contentMap not available for the `pathToUrl` Transform.");
		}
		if (isValidUrl(filepathOrUrl)) {
			return filepathOrUrl;
		}

		let inputDir = eleventyConfig.directories.input;

		let suffix = "";
		[suffix, filepathOrUrl] = parseFilePath(filepathOrUrl);
		filepathOrUrl = normalizeInputPath(filepathOrUrl, inputDir, contentMap);

		let urls = contentMap[filepathOrUrl];
		if (!filepathOrUrl || !urls || urls.length === 0) {
			// fallback, transforms don’t error on missing paths (though the pathToUrl filter does)
			return `${filepathOrUrl}${suffix}`;
		}

		return `${urls[0]}${suffix}`;
	});
}

Object.defineProperty(FilterPlugin, "eleventyPackage", {
	value: "@11ty/eleventy/inputpath-to-url-filter-plugin",
});

Object.defineProperty(FilterPlugin, "eleventyPluginOptions", {
	value: {
		unique: true,
	},
});

Object.defineProperty(TransformPlugin, "eleventyPackage", {
	value: "@11ty/eleventy/inputpath-to-url-transform-plugin",
});

Object.defineProperty(TransformPlugin, "eleventyPluginOptions", {
	value: {
		unique: true,
	},
});

export default TransformPlugin;

export { FilterPlugin, TransformPlugin };
