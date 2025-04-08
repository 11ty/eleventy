import matchHelper from "posthtml-match-helper";
import { decodeHTML } from "entities";

import slugifyFilter from "../Filters/Slugify.js";
import MemoizeUtil from "../Util/MemoizeFunction.js";

const POSTHTML_PLUGIN_NAME = "11ty/eleventy/id-attribute";

function getTextNodeContent(node) {
	if (node.attrs?.["eleventy:id-ignore"] === "") {
		delete node.attrs["eleventy:id-ignore"];
		return "";
	}
	if (!node.content) {
		return "";
	}

	return node.content
		.map((entry) => {
			if (typeof entry === "string") {
				return entry;
			}
			if (Array.isArray(entry.content)) {
				return getTextNodeContent(entry);
			}
			return "";
		})
		.join("");
}

function IdAttributePlugin(eleventyConfig, options = {}) {
	if (!options.slugify) {
		options.slugify = MemoizeUtil(slugifyFilter);
	}
	if (!options.selector) {
		options.selector = "[id],h1,h2,h3,h4,h5,h6";
	}
	options.decodeEntities = options.decodeEntities ?? true;
	options.checkDuplicates = options.checkDuplicates ?? "error";

	eleventyConfig.htmlTransformer.addPosthtmlPlugin(
		"html",
		function idAttributePosthtmlPlugin(pluginOptions = {}) {
			if (typeof options.filter === "function") {
				if (options.filter(pluginOptions) === false) {
					return function () {};
				}
			}

			return function (tree) {
				// One per page
				let conflictCheck = {};
				// Cache heading nodes for conflict resolution
				let headingNodes = {};

				tree.match(matchHelper(options.selector), function (node) {
					if (node.attrs?.id) {
						let id = node.attrs?.id;
						if (conflictCheck[id]) {
							conflictCheck[id]++;
							if (headingNodes[id]) {
								// Rename conflicting assigned heading id
								let newId = `${id}-${conflictCheck[id]}`;
								headingNodes[newId] = headingNodes[id];
								headingNodes[newId].attrs.id = newId;
								delete headingNodes[id];
							} else if (options.checkDuplicates === "error") {
								// Existing `id` conflicts with assigned heading id, throw error
								throw new Error(
									'You have more than one HTML `id` attribute using the same value (id="' +
										id +
										'") in your template (' +
										pluginOptions.page.inputPath +
										"). You can disable this error in the IdAttribute plugin with the `checkDuplicates: false` option.",
								);
							}
						} else {
							conflictCheck[id] = 1;
						}
					} else if (!node.attrs?.id && node.content) {
						node.attrs = node.attrs || {};
						let textContent = getTextNodeContent(node);
						if (options.decodeEntities) {
							textContent = decodeHTML(textContent);
						}
						let id = options.slugify(textContent);

						if (conflictCheck[id]) {
							conflictCheck[id]++;
							id = `${id}-${conflictCheck[id]}`;
						} else {
							conflictCheck[id] = 1;
						}

						headingNodes[id] = node;
						node.attrs.id = id;
					}

					return node;
				});
			};
		},
		{
			// pluginOptions
			name: POSTHTML_PLUGIN_NAME,
		},
	);
}

export { IdAttributePlugin };
