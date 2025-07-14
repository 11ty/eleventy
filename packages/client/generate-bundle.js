import { default as bundleClient } from "@11ty/package-bundler";
import pkg from "../../package.json" with { type: "json" };

const PREFIX = `[11ty/bundle/client] `;

await bundleClient("./src/BundleCore.js", "./dist/eleventy.core.js", {
	name: `Eleventy v${pkg.version} (Minimal Bundle)`,
	moduleRoot: ".",
	// No core-bundled plugins, reduced feature set
	minimalBundle: true,
	esbuild: {
		// minify: true
	},
});
console.log(`${PREFIX}Wrote dist/eleventy.core.js`);

// Careful, this one is big!
await bundleClient("./src/BundleEleventy.js", `./dist/eleventy.js`, {
	name: `Eleventy v${pkg.version} (Bundle)`,
	moduleRoot: ".",
	// Named export FileSystem for using the file system in other packages
	fileSystemMode: "publish",
});

console.log(`${PREFIX}Wrote dist/eleventy.js`);

// fs.writeFileSync("./visualize.json", JSON.stringify(result.metafile));
// // esbuild-visualizer --metadata ./visualize/meta.json --filename visualize/stats.html

await bundleClient(import.meta.resolve("./src/BundleLiquid.js"), `./dist/eleventy-liquid.js`, {
	name: `Eleventy v${pkg.version} (Liquid Engine Bundle)`,
	moduleRoot: ".",
});
console.log(`${PREFIX}Wrote dist/eleventy-liquid.js`);

await bundleClient(import.meta.resolve("./src/BundleNunjucks.js"), `./dist/eleventy-nunjucks.js`, {
	name: `Eleventy v${pkg.version} (Nunjucks Engine Bundle)`,
	moduleRoot: ".",
});
console.log(`${PREFIX}Wrote dist/eleventy-nunjucks.js`);

await bundleClient(import.meta.resolve("./src/BundleMarkdown.js"), `./dist/eleventy-markdown.js`, {
	name: `Eleventy v${pkg.version} (Markdown Engine Bundle)`,
	moduleRoot: ".",
});
console.log(`${PREFIX}Wrote dist/eleventy-markdown.js`);
