import pkg from "../package.json" with { type: "json" };
import packageBundler from "@11ty/package-bundler";

await packageBundler("./src/BundleCore.js", "../dist/client/eleventy.core.js", {
	name: `Eleventy v${pkg.version} (Minimal Bundle)`,
	moduleRoot: "..",
	// No core-bundled plugins, reduced feature set
	minimalBundle: true,
	esbuild: {
		// minify: true
	},
});

// Careful, this one is big!
await packageBundler("./src/BundleEleventy.js", `../dist/client/eleventy.js`, {
	name: `Eleventy v${pkg.version} (Bundle)`,
	moduleRoot: "..",
	// Named export FileSystem for using the file system in other packages
	fileSystemMode: "publish",
});

await packageBundler(
	import.meta.resolve("./src/BundleLiquid.js"),
	`../dist/client/eleventy-liquid.js`,
	{
		name: `Eleventy v${pkg.version} (Liquid Engine Bundle)`,
		moduleRoot: "..",
	},
);
await packageBundler(
	import.meta.resolve("./src/BundleNunjucks.js"),
	`../dist/client/eleventy-nunjucks.js`,
	{
		name: `Eleventy v${pkg.version} (Nunjucks Engine Bundle)`,
		moduleRoot: "..",
	},
);
await packageBundler(
	import.meta.resolve("./src/BundleMarkdown.js"),
	`../dist/client/eleventy-markdown.js`,
	{
		name: `Eleventy v${pkg.version} (Markdown Engine Bundle)`,
		moduleRoot: "..",
	},
);

console.log("[11ty/package-bundler] generated 5 bundles to dist/client/*\n");
