export default function (config) {
	config.addFilter("url", () => {
		throw new Error(
			"The `url` filter is not included with the `@11ty/client` bundle. It is provided in the larger `@11ty/client/eleventy` bundle.",
		);
	});

	config.addFilter("inputPathToUrl", () => {
		throw new Error(
			"The `inputPathToUrl` filter is not included with the `@11ty/client` bundle. It is provided in the larger `@11ty/client/eleventy` bundle.",
		);
	});

	// Saves ~26KB (minified)
	config.addFilter("slugify", () => {
		throw new Error(
			"The `slugify` filter is not included with the `@11ty/client` bundle. You can add it yourself via `eleventyConfig.addFilter()` or use the larger `@11ty/client/eleventy` bundle instead.",
		);
	});
}
