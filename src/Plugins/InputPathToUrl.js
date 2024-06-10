import { TemplatePath } from "@11ty/eleventy-utils";

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

function parseFilePathForHashSupport(filepath) {
	try {
		let u = new URL(filepath, "file:");
		return {
			// hash includes # sign
			hash: u.hash,
			pathname: u.pathname,
		};
	} catch (e) {
		return {
			hash: "",
			pathname: filepath,
		};
	}
}

function FilterPlugin(eleventyConfig) {
	let contentMap;
	eleventyConfig.on("eleventy.contentMap", function ({ inputPathToUrl }) {
		contentMap = inputPathToUrl;
	});

	eleventyConfig.addFilter("inputPathToUrl", function (filepath) {
		if (!contentMap) {
			throw new Error("Internal error: contentMap not available for `inputPathToUrl` filter.");
		}

		let inputDir = eleventyConfig.directories.input;
		let { hash, pathname } = parseFilePathForHashSupport(filepath);
		pathname = normalizeInputPath(pathname, inputDir, contentMap);

		let urls = contentMap[pathname];
		if (!urls || urls.length === 0) {
			throw new Error("`inputPathToUrl` filter could not find a matching target for " + filepath);
		}

		return `${urls[0]}${hash}`;
	});
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
		let inputDir = eleventyConfig.directories.input;

		let { hash, pathname } = parseFilePathForHashSupport(filepathOrUrl);
		pathname = normalizeInputPath(pathname, inputDir, contentMap);

		let urls = contentMap[pathname];
		if (!urls || urls.length === 0) {
			// fallback, transforms don’t error on missing paths (though the pathToUrl filter does)
			return `${pathname}${hash}`;
		}

		return `${urls[0]}${hash}`;
	});
}

Object.defineProperty(TransformPlugin, "eleventyPackage", {
	value: "@11ty/eleventy/inputpath-to-url-plugin",
});

Object.defineProperty(TransformPlugin, "eleventyPluginOptions", {
	value: {
		unique: true,
	},
});

export default TransformPlugin;

export { FilterPlugin, TransformPlugin };
