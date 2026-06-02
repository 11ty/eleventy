import module from "node:module";
import { resolve, addToModifiedPaths } from "./EsmResolver.js";

// module.register (old, deprecated)
import { MessageChannel } from "node:worker_threads";
const { port1, port2 } = new MessageChannel();

// ESM Cache Buster
// - register requires Node 18.19+ https://nodejs.org/docs/latest/api/module.html#moduleregisterspecifier-parenturl-options
// - registerHooks requires Node 22.15+
// Fixes https://github.com/11ty/eleventy/issues/3270

// ENV variable for https://github.com/11ty/eleventy/issues/3371
if (!process?.env?.ELEVENTY_SKIP_ESM_RESOLVER) {
	if ("registerHooks" in module) {
		module.registerHooks({
			// sync-only
			resolve,
		});
	} else if ("register" in module) {
		module.register("./EsmResolver.js", import.meta.url, {
			parentURL: import.meta.url,
			data: {
				port: port2,
			},
			transferList: [port2],
		});
	}
}

export function addModifiedPath(path, date) {
	if (process?.env?.ELEVENTY_SKIP_ESM_RESOLVER) {
		return;
	}

	if ("registerHooks" in module) {
		addToModifiedPaths(path, date);
	} else if ("register" in module) {
		port1.postMessage({ path: path, newDate: date });
	}
}
