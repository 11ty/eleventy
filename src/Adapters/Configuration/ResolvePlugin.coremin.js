export function resolvePlugin() {
	throw new Error(
		"eleventyConfig.resolvePlugin() is not supported in the Eleventy reduced core bundle. You can use the standard bundle or use `import` directly for plugins.",
	);
}
