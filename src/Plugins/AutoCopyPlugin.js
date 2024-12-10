import { AutoCopy } from "../Util/AutoCopy.js";

// one AutoCopy instance per entry
function init(eleventyConfig, options) {
	let opts = Object.assign(
		{
			extensions: "html",
			match: false, // can be one glob string or an array of globs
			paths: [], // directories to also look in for files
			failOnError: true, // fails when a path matches (via `match`) but not found on file system
			copyOptions: undefined,
		},
		options,
	);

	let ac = new AutoCopy();
	ac.setUserConfig(eleventyConfig);
	ac.addMatchingGlob(opts.match);
	ac.setFailOnError(opts.failOnError);
	ac.setCopyOptions(opts.copyOptions);

	eleventyConfig.htmlTransformer.addUrlTransform(
		opts.extensions,
		function (targetFilepathOrUrl) {
			// @ts-ignore
			ac.copy(targetFilepathOrUrl, this.page.inputPath, this.page.outputPath);

			// TODO front matter option for manual copy

			return targetFilepathOrUrl;
		},
		{
			enabled: () => ac.isEnabled(),
			// - MUST run after other plugins but BEFORE HtmlBase plugin
			priority: -1,
		},
	);

	ac.addPaths(opts.paths);
}

function AutoCopyPlugin(eleventyConfig) {
	// Important: if this is empty, no URL transforms are added
	for (let options of eleventyConfig.autoCopies) {
		init(eleventyConfig, options);
	}
}

Object.defineProperty(AutoCopyPlugin, "eleventyPackage", {
	value: "@11ty/eleventy/autocopy-transform-plugin",
});

export { AutoCopyPlugin };
