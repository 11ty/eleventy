import { createRequire } from "node:module";

// important to clear the require.cache in CJS projects
const require = createRequire(import.meta.url);

export const eleventyPackageJson = require("../../package.json");

export function clearRequireCache(absolutePath) {
	// ESM Eleventy when using `import()` on a CJS project file still adds to require.cache
	if (absolutePath in (require?.cache || {})) {
		delete require.cache[absolutePath];
	}
}

export function importJsonSync(filePath) {
	if (!filePath || !filePath.endsWith(".json")) {
		throw new Error(`importJsonSync expects a .json file extension (received: ${filePath})`);
	}

	return require(filePath);
}
