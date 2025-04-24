// import EleventyDevServer from "@11ty/eleventy-dev-server";

export function getDevServer() {
	return import("@11ty/eleventy-dev-server").then((i) => i.default);
}
