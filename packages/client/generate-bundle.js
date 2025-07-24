import fs from "node:fs";
import { default as bundleClient } from "@11ty/package-bundler";

import pkg from "../../package.json" with { type: "json" };
import { readableFileSize } from "../../src/Util/FileSize.js";

const PREFIX = `[11ty/bundle/client] `;

function size(filepath) {
	return readableFileSize(fs.statSync(filepath).size);
}

await bundleClient("./src/BundleCore.js", "./dist/eleventy.core.js", {
	name: `Eleventy v${pkg.version} (@11ty/client Bundle)`,
	moduleRoot: "../../",
	// No core-bundled plugins, reduced feature set
	adapterSuffixes: [".client.js", ".core.js"],
	external: ["node:fs", "node:crypto", "@sindresorhus/slugify"],
	esbuild: {
		keepNames: false,
		// minify: true
	},
});

console.log(`${PREFIX}Wrote dist/eleventy.core.js: ${size("./dist/eleventy.core.js")}`);

// Careful, this one is big!
await bundleClient("./src/BundleEleventy.js", `./dist/eleventy.js`, {
	name: `Eleventy v${pkg.version} (@11ty/client/eleventy Bundle)`,
	moduleRoot: "../../",
	adapterSuffixes: [".core.js"],
	// Adds named export FileSystem for using the file system in other packages
	fileSystemMode: "publish",
});
console.log(`${PREFIX}Wrote dist/eleventy.js: ${size("./dist/eleventy.js")}`);

// fs.mkdirSync("./visualize/", { recursive: true });
// fs.writeFileSync("./visualize/meta.json", JSON.stringify(result.metafile));
// npx esbuild-visualizer --metadata ./packages/client/visualize/meta.json --filename packages/client/visualize/index.html

await bundleClient(
	import.meta.resolve("./src/BundleLiquid.js"),
	`./dist/formats/eleventy-liquid.js`,
	{
		name: `Eleventy v${pkg.version} (@11ty/client/liquid Engine Bundle)`,
		moduleRoot: "../../",
		adapterSuffixes: [".core.js"],
	},
);
console.log(
	`${PREFIX}Wrote dist/formats/eleventy-liquid.js: ${size("./dist/formats/eleventy-liquid.js")}`,
);

await bundleClient(
	import.meta.resolve("./src/BundleNunjucks.js"),
	`./dist/formats/eleventy-nunjucks.js`,
	{
		name: `Eleventy v${pkg.version} (@11ty/client/njk Engine Bundle)`,
		moduleRoot: "../../",
	},
);
console.log(
	`${PREFIX}Wrote dist/formats/eleventy-nunjucks.js: ${size("./dist/formats/eleventy-nunjucks.js")}`,
);

await bundleClient(
	import.meta.resolve("./src/BundleMarkdown.js"),
	`./dist/formats/eleventy-markdown.js`,
	{
		name: `Eleventy v${pkg.version} (@11ty/client/md Engine Bundle)`,
		moduleRoot: "../../",
		adapterSuffixes: [".core.js"],
	},
);
console.log(
	`${PREFIX}Wrote dist/formats/eleventy-markdown.js: ${size("./dist/formats/eleventy-markdown.js")}`,
);

await bundleClient(
	import.meta.resolve("./src/BundleI18nPlugin.js"),
	`./dist/plugins/eleventy-plugin-i18n.js`,
	{
		name: `Eleventy v${pkg.version} (i18n Plugin)`,
		moduleRoot: "../../",
		adapterSuffixes: [".core.js"],
	},
);
console.log(
	`${PREFIX}Wrote dist/plugins/eleventy-plugin-i18n.js: ${size("./dist/plugins/eleventy-plugin-i18n.js")}`,
);
