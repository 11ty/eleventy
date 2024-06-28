import debugUtil from "debug";

const debug = debugUtil("Eleventy:EsmResolver");

let lastModifiedPaths = new Map();
export async function initialize({ port }) {
	// From `eleventy.importCacheReset` event in Require.js
	port.on("message", ({ path, newDate }) => {
		lastModifiedPaths.set(path, newDate);
	});
}

// Fixes issue https://github.com/11ty/eleventy/issues/3270
// Docs: https://nodejs.org/docs/latest/api/module.html#resolvespecifier-context-nextresolve
export async function resolve(specifier, context, nextResolve) {
	try {
		// Not a relative import and not a file import
		// Or from node_modules (perhaps better to check if the specifier is in the project directory instead)
		if (
			(!specifier.startsWith("../") &&
				!specifier.startsWith("./") &&
				!specifier.startsWith("file:")) ||
			context.parentURL.includes("/node_modules/")
		) {
			return nextResolve(specifier);
		}

		let fileUrl = new URL(specifier, context.parentURL);
		if (fileUrl.searchParams.has("_cache_bust")) {
			// already is cache busted outside resolver (wider compat, url was changed prior to import, probably in Require.js)
			return nextResolve(specifier);
		}

		let absolutePath = fileUrl.pathname;
		// Bust the import cache if this is a recently modified file
		if (lastModifiedPaths.has(absolutePath)) {
			fileUrl.search = ""; // delete existing searchparams
			fileUrl.searchParams.set("_cache_bust", lastModifiedPaths.get(absolutePath));
			debug("Cache busting %o to %o", specifier, fileUrl.toString());

			return nextResolve(fileUrl.toString());
		}
	} catch (e) {
		debug("EsmResolver Error parsing specifier (%o): %o", specifier, e);
	}

	return nextResolve(specifier);
}

// export async function load(url, context, nextLoad) {
// }
