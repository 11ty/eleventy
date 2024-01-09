import posthtml from "posthtml";
import urls from "posthtml-urls";

class UrlTransformer {
	constructor() {
		// order is important
		this.callbacks = {};
		this.posthtmlProcessOptions = {};
	}

	// context is important as it is used in html base plugin for page specific URL
	getPosthtmlInstance(extension, context = {}) {
		return posthtml().use(
			urls({
				eachURL: (url) => {
					// and: attrName, tagName
					for (let { fn: callback } of this.getCallbacks(extension)) {
						url = callback.call(context, url);
					}

					return url;
				},
			}),
		);
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

	setPosthtmlProcessOptions(options) {
		Object.assign(this.posthtmlProcessOptions, options);
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

	static async transformStandalone(content, callback, posthtmlProcessOptions = {}) {
		let modifier = posthtml().use(
			urls({
				eachURL: (url) => {
					return callback(url);
				},
			}),
		);

		let result = await modifier.process(content, posthtmlProcessOptions);
		return result.html;
	}

	/* filepath is a template’s outputPath */
	async transformContent(filepath, content, context) {
		let extension = this.getFileExtension(filepath);
		if (!this.isTransformable(extension)) {
			return content;
		}

		let result = await this.getPosthtmlInstance(extension, context).process(
			content,
			this.posthtmlProcessOptions,
		);
		return result.html;
	}
}

export { UrlTransformer };
