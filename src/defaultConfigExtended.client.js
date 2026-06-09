export default function (config) {
	config.addFilter("url", () => {
		throw new Error(
			"The `url` filter is not included with the `@awesome.me/buildawesome-browser` bundle. Use the `@awesome.me/buildawesome-browser/core-fs` bundle.",
		);
	});

	config.addFilter("inputPathToUrl", () => {
		throw new Error(
			"The `inputPathToUrl` filter is not included with the `@awesome.me/buildawesome-browser` bundle. Use the larger `@awesome.me/buildawesome-browser/core-fs` bundle.",
		);
	});

	// Saves ~26KB (minified)
	// Differences from main bundle: async and not memoized
	config.addAsyncFilter("slugify", async function (str, options = {}) {
		return import("@sindresorhus/slugify")
			.then((mod) => mod.default)
			.then((slugify) => {
				options.decamelize ??= false;
				return slugify("" + str, options);
			});
	});
}
