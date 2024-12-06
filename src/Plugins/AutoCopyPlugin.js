import { AutoCopy } from "../Util/AutoCopy.js";

function AutoCopyPlugin(eleventyConfig, defaultOptions = {}) {
	let opts = Object.assign(
		{
			extensions: "html",
			match: false,
			paths: [], // directories to also look in for files
			failOnError: true, // fails when a path matches (via `match`) but not found on file system
			copyOptions: undefined,
		},
		defaultOptions,
	);

	let ac = eleventyConfig.autoCopy;
	if (!ac) {
		ac = new AutoCopy();
		ac.setUserConfig(eleventyConfig);
		eleventyConfig.autoCopy = ac;

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
	}

	ac.addMatchingGlob(opts.match);
	ac.addPaths(opts.paths);
}

Object.defineProperty(AutoCopyPlugin, "eleventyPackage", {
	value: "@11ty/eleventy/autocopy-transform-plugin",
});

export { AutoCopyPlugin };
