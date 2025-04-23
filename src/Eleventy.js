/* Core */
export { Core as default, Core as Eleventy } from "./Core.js";

/* Utils */
export { EleventyImport as ImportFile } from "./Util/Require.js";

/* Plugins */
export { default as BundlePlugin } from "@11ty/eleventy-plugin-bundle";

// Eleventy*Plugin names are legacy names
export {
	default as RenderPlugin,
	default as EleventyRenderPlugin,
} from "./Plugins/RenderPlugin.js";
export { default as I18nPlugin, default as EleventyI18nPlugin } from "./Plugins/I18nPlugin.js";
export {
	default as HtmlBasePlugin,
	default as EleventyHtmlBasePlugin,
} from "./Plugins/HtmlBasePlugin.js";
export { TransformPlugin as InputPathToUrlTransformPlugin } from "./Plugins/InputPathToUrl.js";
export { IdAttributePlugin } from "./Plugins/IdAttributePlugin.js";

// Error messages for Removed plugins
export function EleventyServerlessBundlerPlugin() {
	throw new Error(
		"Following feedback from our Community Survey, low interest in this plugin prompted its removal from Eleventy core in 3.0 as we refocus on static sites. Learn more: https://v3.11ty.dev/docs/plugins/serverless/",
	);
}

export { EleventyServerlessBundlerPlugin as EleventyServerless };

export function EleventyEdgePlugin() {
	throw new Error(
		"Following feedback from our Community Survey, low interest in this plugin prompted its removal from Eleventy core in 3.0 as we refocus on static sites. Learn more: https://v3.11ty.dev/docs/plugins/edge/",
	);
}
