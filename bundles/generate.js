// import fs from "node:fs";
import { default as bundleClient } from "@11ty/package-bundler";
import pkg from "../package.json" with { type: "json" };

// let result = await bundleNode(
// 	import.meta.resolve("../src/Eleventy.js"),
// 	`../dist/node/eleventy.js`,
// 	{
// 		name: `Eleventy v${pkg.version} (Full)`,
// 	},
// );

// fs.writeFileSync("./visualize.json", JSON.stringify(result.metafile));
// // esbuild-visualizer --metadata ./visualize/meta.json --filename visualize/stats.html

await bundleClient("./src/BundleCore.js", "../dist/client/eleventy.core.js", {
	name: `Eleventy v${pkg.version} (Minimal Bundle)`,
	moduleRoot: "..",
	// No core-bundled plugins, reduced feature set
	minimalBundle: true,
	esbuild: {
		// minify: true
	},
});

// Careful, this one is big!
await bundleClient("./src/BundleEleventy.js", `../dist/client/eleventy.js`, {
	name: `Eleventy v${pkg.version} (Bundle)`,
	moduleRoot: "..",
	// Named export FileSystem for using the file system in other packages
	fileSystemMode: "publish",
});

await bundleClient(
	import.meta.resolve("./src/BundleLiquid.js"),
	`../dist/client/eleventy-liquid.js`,
	{
		name: `Eleventy v${pkg.version} (Liquid Engine Bundle)`,
		moduleRoot: "..",
	},
);
await bundleClient(
	import.meta.resolve("./src/BundleNunjucks.js"),
	`../dist/client/eleventy-nunjucks.js`,
	{
		name: `Eleventy v${pkg.version} (Nunjucks Engine Bundle)`,
		moduleRoot: "..",
	},
);
await bundleClient(
	import.meta.resolve("./src/BundleMarkdown.js"),
	`../dist/client/eleventy-markdown.js`,
	{
		name: `Eleventy v${pkg.version} (Markdown Engine Bundle)`,
		moduleRoot: "..",
	},
);

console.log("[11ty/package-bundler] generated 5 bundles to dist/*\n");
