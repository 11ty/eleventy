import bundlePlugin from "@11ty/eleventy-plugin-bundle";

import { HtmlTransformer } from "../../Util/HtmlTransformer.js";
import { HtmlRelativeCopyPlugin } from "../../Plugins/HtmlRelativeCopyPlugin.js";

/**
 * @typedef {object} config
 * @property {addPlugin} addPlugin - Execute or defer a plugin’s execution.
 * @property {addTransform} addTransform - Add an Eleventy transform to postprocess template output
 * @property {htmlTransformer} htmlTransformer - HTML modification API
 */

/**
 * Extended default configuration object factory.
 *
 * @param {config} config - Eleventy configuration object.
 * @returns {defaultConfig}
 */
export default function (config) {
	// Used for the HTML <base>, InputPathToUrl, Image transform plugins
	let htmlTransformer = new HtmlTransformer();
	htmlTransformer.setUserConfig(config);

	// This needs to be assigned before bundlePlugin is added below.
	config.htmlTransformer = htmlTransformer;

	// Remember: the transform added here runs before the `htmlTransformer` transform
	config.addPlugin(bundlePlugin, {
		bundles: false, // no default bundles included—must be opt-in.
		immediate: true,
	});

	// Run the `htmlTransformer` transform
	config.addTransform("@11ty/eleventy/html-transformer", async function (content) {
		// Runs **AFTER** the bundle plugin transform (except: delayed bundles)
		return htmlTransformer.transformContent(this.outputPath, content, this);
	});

	// Requires user configuration, so must run as second-stage
	config.addPlugin(HtmlRelativeCopyPlugin);
}
