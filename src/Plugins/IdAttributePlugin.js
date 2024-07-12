import matchHelper from "posthtml-match-helper";

import slugifyFilter from "../Filters/Slugify.js";
import MemoizeUtil from "../Util/MemoizeFunction.js";

function getTextNodeContent(node) {
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
		options.selector = "h1,h2,h3,h4,h5,h6";
	}

	eleventyConfig.htmlTransformer.addPosthtmlPlugin(
		"html",
		function (/*pluginOptions = {}*/) {
			return function (tree) {
				// One per page
				let conflictCheck = {};

				tree.match(matchHelper(options.selector), function (node) {
					if (!node.attrs?.id && node.content) {
						node.attrs = node.attrs || {};
						let id = options.slugify(getTextNodeContent(node));
						if (conflictCheck[id]) {
							conflictCheck[id]++;
							id = `${id}-${conflictCheck[id]}`;
						} else {
							conflictCheck[id] = 1;
						}

						node.attrs.id = id;
					}

					return node;
				});
			};
		} /* , {} // pluginOptions */,
	);
}

export { IdAttributePlugin };
