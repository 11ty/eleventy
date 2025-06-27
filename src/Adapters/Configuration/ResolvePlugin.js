import HtmlBasePlugin from "../../Plugins/HtmlBasePlugin.js";
import InputPathToUrlPlugin from "../../Plugins/InputPathToUrl.js";

export function resolvePlugin(name) {
	let filenameLookup = {
		"@11ty/eleventy/html-base-plugin": HtmlBasePlugin,
		"@11ty/eleventy/inputpath-to-url-plugin": InputPathToUrlPlugin,

		// Async plugins:
		// v3.2.0 moved RenderPlugin to async for bundle size reasons (Liquid import)
		"@11ty/eleventy/render-plugin": "./Plugins/RenderPlugin.js",
		// requires e.g. `await resolvePlugin("@11ty/eleventy/i18n-plugin")` to avoid preloading i18n dependencies.
		// see https://github.com/11ty/eleventy-plugin-rss/issues/52
		"@11ty/eleventy/i18n-plugin": "./Plugins/I18nPlugin.js",
	};

	if (!filenameLookup[name]) {
		throw new Error(
			`Invalid name "${name}" passed to resolvePlugin. Valid options: ${Object.keys(filenameLookup).join(", ")}`,
		);
	}

	// Future improvement: add support for any npm package name?
	if (typeof filenameLookup[name] === "string") {
		// returns promise
		return import(filenameLookup[name]).then((plugin) => plugin.default);
	}

	// return reference
	return filenameLookup[name];
}
