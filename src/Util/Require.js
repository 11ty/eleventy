import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import module from "node:module";
import { MessageChannel } from "node:worker_threads";

import { TemplatePath } from "@11ty/eleventy-utils";

import eventBus from "../EventBus.js";

const { port1, port2 } = new MessageChannel();

// ESM Cache Buster is an enhancement that works in Node 18.19+
// https://nodejs.org/docs/latest/api/module.html#moduleregisterspecifier-parenturl-options
// Fixes https://github.com/11ty/eleventy/issues/3270
// ENV variable for https://github.com/11ty/eleventy/issues/3371
if ("register" in module && !process?.env?.ELEVENTY_SKIP_ESM_RESOLVER) {
	module.register("./EsmResolver.js", import.meta.url, {
		parentURL: import.meta.url,
		data: {
			port: port2,
		},
		transferList: [port2],
	});
}

// important to clear the require.cache in CJS projects
const require = module.createRequire(import.meta.url);

const requestPromiseCache = new Map();

// Used for JSON imports, suffering from Node warning that import assertions experimental but also
// throwing an error if you try to import() a JSON file without an import assertion.
/**
 *
 * @returns {string|undefined}
 */
function loadContents(path, options = {}) {
	let rawInput;
	/** @type {string} */
	let encoding = "utf8"; // JSON is utf8
	if (options?.encoding || options?.encoding === null) {
		encoding = options.encoding;
	}

	try {
		// @ts-expect-error This is an error in the upstream types
		rawInput = fs.readFileSync(path, encoding);
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
		let newDate = Date.now();
		lastModifiedPaths.set(absolutePath, newDate);

		// post to EsmResolver worker thread
		if (port1) {
			port1.postMessage({ path: absolutePath, newDate });
		}

		// ESM Eleventy when using `import()` on a CJS project file still adds to require.cache
		if (absolutePath in (require?.cache || {})) {
			delete require.cache[absolutePath];
		}
	}
});

async function dynamicImportAbsolutePath(absolutePath, type, returnRaw = false) {
	if (absolutePath.endsWith(".json") || type === "json") {
		// https://v8.dev/features/import-assertions#dynamic-import() is still experimental in Node 20
		let rawInput = loadContents(absolutePath);
		if (!rawInput) {
			return;
		}
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

	let promise;
	if (requestPromiseCache.has(urlPath)) {
		promise = requestPromiseCache.get(urlPath);
	} else {
		promise = import(urlPath);
		requestPromiseCache.set(urlPath, promise);
	}

	if (returnRaw) {
		return promise;
	}

	return promise.then((target) => {
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
	});
}

function normalizeFilePathInEleventyPackage(file) {
	// Back up relative paths from ./src/Util/Require.js
	return path.resolve(fileURLToPath(import.meta.url), "../../../", file);
}

async function dynamicImportFromEleventyPackage(file) {
	// points to files relative to the top level Eleventy directory
	let filePath = normalizeFilePathInEleventyPackage(file);

	// Returns promise
	return dynamicImportAbsolutePath(filePath, "esm");
}

async function dynamicImport(localPath, type) {
	let absolutePath = TemplatePath.absolutePath(localPath);

	// Returns promise
	return dynamicImportAbsolutePath(absolutePath, type);
}

/* Used to import default Eleventy configuration file, raw means we don’t normalize away the `default` export */
async function dynamicImportRawFromEleventyPackage(file) {
	// points to files relative to the top level Eleventy directory
	let filePath = normalizeFilePathInEleventyPackage(file);

	// Returns promise
	return dynamicImportAbsolutePath(filePath, "esm", true);
}

/* Used to import project configuration files, raw means we don’t normalize away the `default` export */
async function dynamicImportRaw(localPath, type) {
	let absolutePath = TemplatePath.absolutePath(localPath);

	// Returns promise
	return dynamicImportAbsolutePath(absolutePath, type, true);
}

export {
	loadContents as EleventyLoadContent,
	dynamicImport as EleventyImport,
	dynamicImportRaw as EleventyImportRaw,
	dynamicImportFromEleventyPackage as EleventyImportFromEleventy,
	dynamicImportRawFromEleventyPackage as EleventyImportRawFromEleventy,
	normalizeFilePathInEleventyPackage,
};
