import module from "node:module";

// important to clear the require.cache in CJS projects
const require = module.createRequire(import.meta.url);

export function clearRequireCache(absolutePath) {
	// ESM Eleventy when using `import()` on a CJS project file still adds to require.cache
	if (absolutePath in (require?.cache || {})) {
		delete require.cache[absolutePath];
	}
}
