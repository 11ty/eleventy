import module from "node:module";
import { MessageChannel } from "node:worker_threads";

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

export { port1 };
