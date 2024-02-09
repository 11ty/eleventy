import { parseHTML } from "linkedom";
import { UrlModifier } from "./UrlModifier.js";

class HtmlTransformer {
	constructor() {
		// order is important
		this.callbacks = {};
	}

	add(extensions, callback, options = {}) {
		options = Object.assign(
			{
				priority: 0,
			},
			options,
		);

		let extensionsArray = (extensions || "").split(",");
		for (let ext of extensionsArray) {
			if (!this.callbacks[ext]) {
				this.callbacks[ext] = [];
			}

			this.callbacks[ext].push({
				fn: callback,
				priority: options.priority,
			});

			this.callbacks[ext].sort((a, b) => {
				if (b.priority > a.priority) {
					return 1;
				}
				if (a.priority > b.priority) {
					return -1;
				}
				return 0;
			});
		}
	}

	getFileExtension(filepath) {
		return (filepath || "").split(".").pop();
	}

	isTransformable(extension) {
		return !!this.callbacks[extension];
	}

	getCallbacks(extension) {
		return this.callbacks[extension] || [];
	}

	static async transformStandalone(content, singleCallback) {
		let { document } = parseHTML(content);
		let nodes = UrlModifier.findNodes(document);

		UrlModifier.modifyNodes(nodes, (url /*, node */) => {
			return singleCallback(url);
		});

		return document.toString();
	}

	/* filepath is a template’s outputPath */
	async transformContent(filepath, content, context) {
		let extension = this.getFileExtension(filepath);
		if (!this.isTransformable(extension)) {
			return content;
		}

		let { document } = parseHTML(content);

		// TODO eleventy-img wrapper.
		// let images = document.querySelectorAll("img");
		// let picture = document.createElement("picture");
		// for(let img of images) {
		// 	console.log( img.matches("body img") );
		// 	let p = picture.cloneNode();
		// 	img.replaceWith(p);
		// 	p.appendChild(img);
		// }

		let nodes = UrlModifier.findNodes(document);
		UrlModifier.modifyNodes(nodes, (url /*, node */) => {
			// and: attrName, tagName
			for (let { fn: callback } of this.getCallbacks(extension)) {
				// context is important as it is used in html base plugin for page specific URL
				url = callback.call(context, url);
			}

			return url;
		});

		let html = document.toString();

		// linkedom always transforms to uppercase doctype <!DOCTYPE
		// Not sure if this should stay or not? It does fix our failing tests
		let lowercaseDoctype = "<!doctype ";
		if (content.startsWith(lowercaseDoctype)) {
			return lowercaseDoctype + html.slice(lowercaseDoctype.length);
		}

		return html;
	}
}

export { HtmlTransformer };
