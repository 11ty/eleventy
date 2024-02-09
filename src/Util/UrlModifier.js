import { parseSrcset, stringifySrcset } from "srcset";

class UrlModifier {
	// Pruned from https://github.com/posthtml/posthtml-urls/blob/master/lib/defaultOptions.js
	// to remove deprecated/removed tag/attribute combos
	static selectors = {
		// head et al
		base: ["href"],
		link: ["href"],
		'meta[http-equiv="refresh"]': ["content"],
		script: ["src"],

		// links
		a: ["href", "ping"],
		area: ["href", "ping"],

		// cite
		blockquote: ["cite"],
		del: ["cite"],
		ins: ["cite"],
		q: ["cite"],

		// forms
		button: ["formaction"],
		form: ["action"],
		input: ["src", "formaction"],

		// media
		audio: ["src"],
		img: ["src", "srcset"],
		source: ["src", "srcset"],
		track: ["src"],
		// video does not yet have srcset: https://scottjehl.com/posts/using-responsive-video/
		video: ["poster", "src"],

		// third party
		embed: ["src"],
		iframe: ["src"],
		object: ["data"],
	};

	static attributeCallbacks = {
		__default: (value, urlCallback, node) => {
			return urlCallback(value, node);
		},
		// meta
		content: (value, urlCallback, node) => {
			if (node.tagName === "META") {
				let [seconds, ...url] = value.split(";");
				return `${seconds};${urlCallback(url.join(";"), node)}`;
			}

			return value;
		},
		srcset: (value, urlCallback, node) => {
			let values = parseSrcset(value);
			for (let value of values) {
				let override = urlCallback(value.url, node);
				if (override) {
					value.url = override;
				}
			}

			return stringifySrcset(values);
		},
	};

	static findNodes(linkedomDocument) {
		return linkedomDocument.querySelectorAll(Object.keys(this.selectors).join(","));
	}

	static modifyNodes(nodes, urlCallback) {
		for (let node of nodes) {
			let attrs = UrlModifier.selectors[node.tagName.toLowerCase()] || [];
			for (let attrName of attrs) {
				let attrValue = node.getAttribute(attrName);
				let lookupAttrName = attrName.toLowerCase();

				// Dependency workaround: linkedom attributes are not case sensitive
				// This preserves case sensitivity of original attribute name
				if (!attrValue) {
					for (let attribute of node.attributes) {
						if (attribute.localName.toLowerCase() === lookupAttrName) {
							attrName = attribute.localName;
							attrValue = attribute.value;
							break;
						}
					}
				}

				if (!attrValue) {
					continue;
				}

				let newUrl;
				if (!this.attributeCallbacks[lookupAttrName]) {
					lookupAttrName = "__default";
				}

				newUrl = this.attributeCallbacks[lookupAttrName](attrValue, urlCallback, node);

				if (newUrl) {
					node.setAttribute(attrName, newUrl);
				} else if (newUrl === false) {
					// remove node if callback returns false
					node.remove();
				}
			}
		}
	}
}

export { UrlModifier };
