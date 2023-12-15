import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { TemplatePath } from "@11ty/eleventy-utils";

import eventBus from "../EventBus.js";

// important to clear the require.cache in CJS projects
const require = createRequire(import.meta.url);

// Used for JSON imports, suffering from Node warning that import assertions experimental but also
// throwing an error if you try to import() a JSON file without an import assertion.
async function loadContents(path, options = {}) {
	let rawInput;
	let encoding = "utf8";
	if ("encoding" in options) {
		encoding = options.encoding;
	}

	try {
		rawInput = await fs.promises.readFile(path, encoding);
	} catch (e) {
		// if file does not exist, return nothing
	}

	// Can return a buffer, string, etc
	if (typeof rawInput === "string") {
		rawInput = rawInput.trim();
	}

	return rawInput;
}

let lastModifiedPaths = new Map();
eventBus.on("eleventy.importCacheReset", (fileQueue) => {
	for (let filePath of fileQueue) {
		let absolutePath = TemplatePath.absolutePath(filePath);
		lastModifiedPaths.set(absolutePath, Date.now());

		// ESM Eleventy when using `import()` on a CJS project file still adds to require.cache
		if (absolutePath in (require?.cache || {})) {
			delete require.cache[absolutePath];
		}
	}
});

async function dynamicImportAbsolutePath(absolutePath, type) {
	if (absolutePath.endsWith(".json") || type === "json") {
		// https://v8.dev/features/import-assertions#dynamic-import() is still experimental in Node 20
		let rawInput = await loadContents(absolutePath);
		return JSON.parse(rawInput);
	}

	let urlPath;
	try {
		let u = new URL(`file:${absolutePath}`);

		// Bust the import cache if this is the last modified file
		if (lastModifiedPaths.has(absolutePath)) {
			u.searchParams.set("_cache_bust", lastModifiedPaths.get(absolutePath));
		}

		urlPath = u.toString();
	} catch (e) {
		urlPath = absolutePath;
	}

	let target = await import(urlPath);

	// If the only export is `default`, elevate to top (for ESM and CJS)
	if (Object.keys(target).length === 1 && "default" in target) {
		return target.default;
	}

	// When using import() on a CommonJS file that exports an object sometimes it
	// returns duplicated values in `default` key, e.g. `{ default: {key: value}, key: value }`

	// A few examples:
	// module.exports = { key: false };
	//    returns `{ default: {key: false}, key: false }` as not expected.
	// module.exports = { key: true };
	// module.exports = { key: null };
	// module.exports = { key: undefined };
	// module.exports = { key: class {} };

	// A few examples where it does not duplicate:
	// module.exports = { key: 1 };
	//    returns `{ default: {key: 1} }` as expected.
	// module.exports = { key: "value" };
	// module.exports = { key: {} };
	// module.exports = { key: [] };

	if (type === "cjs" && "default" in target) {
		let match = true;
		for (let key in target) {
			if (key === "default") {
				continue;
			}
			if (target[key] !== target.default[key]) {
				match = false;
			}
		}

		if (match) {
			return target.default;
		}
	}

	// Otherwise return { default: value, named: value }
	// Object.assign here so we can add things to it in JavaScript.js
	return Object.assign({}, target);
}

function normalizeFilePathInEleventyPackage(file) {
	// Back up from ./src/Util/Require.js
	return path.resolve(fileURLToPath(import.meta.url), "../../../", file);
}

async function dynamicImportFromEleventyPackage(file) {
	// points to files relative to the top level Eleventy directory
	let filePath = normalizeFilePathInEleventyPackage(file);
	return dynamicImportAbsolutePath(filePath);
}

async function dynamicImport(localPath, type) {
	let absolutePath = TemplatePath.absolutePath(localPath);
	// async
	return dynamicImportAbsolutePath(absolutePath, type);
}

export {
	loadContents as EleventyLoadContent,
	dynamicImport as EleventyImport,
	dynamicImportFromEleventyPackage as EleventyImportFromEleventy,
	normalizeFilePathInEleventyPackage,
};
