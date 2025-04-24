// import EleventyDevServer from "@11ty/eleventy-dev-server";

export function getDevServer() {
	// This happens on demand for performance purposes when not used by builds
	// https://github.com/11ty/eleventy/pull/3689
	return import("@11ty/eleventy-dev-server").then((i) => i.default);
}
