import posthtml from "posthtml";
import urls from "@11ty/posthtml-urls";
import { FilePathUtil } from "./FilePathUtil.js";

class HtmlTransformer {
	// feature test for Eleventy Bundle Plugin
	static SUPPORTS_PLUGINS_ENABLED_CALLBACK = true;

	constructor() {
		// execution order is important (not order of addition/object key order)
		this.callbacks = {};
		this.posthtmlProcessOptions = {};
		this.plugins = {};
	}

	get aggregateBench() {
		if (!this.userConfig) {
			throw new Error("Internal error: Missing `userConfig` in HtmlTransformer.");
		}
		return this.userConfig.benchmarkManager.get("Aggregate");
	}

	setUserConfig(config) {
		this.userConfig = config;
	}

	static prioritySort(a, b) {
		if (b.priority > a.priority) {
			return 1;
		}
		if (a.priority > b.priority) {
			return -1;
		}
		return 0;
	}

	// context is important as it is used in html base plugin for page specific URL
	static _getPosthtmlInstance(callbacks = [], plugins = [], context = {}) {
		let inst = posthtml();

		// already sorted by priority when added
		for (let { fn: plugin, options } of plugins) {
			inst.use(plugin(Object.assign({}, context, options)));
		}

		// Run the built-ins last
		if (callbacks.length > 0) {
			inst.use(
				urls({
					eachURL: (url) => {
						// and: attrName, tagName
						for (let { fn: callback } of callbacks) {
							// already sorted by priority when added
							url = callback.call(context, url);
						}

						return url;
					},
				}),
			);
		}

		return inst;
	}

	_add(extensions, addType, value, options = {}) {
		options = Object.assign(
			{
				priority: 0,
			},
			options,
		);

		let extensionsArray = (extensions || "").split(",");
		for (let ext of extensionsArray) {
			let target = this[addType];
			if (!target[ext]) {
				target[ext] = [];
			}

			target[ext].push({
				fn: value, // callback or plugin
				priority: options.priority,
				enabled: options.enabled || (() => true),
				options: options.pluginOptions,
			});

			target[ext].sort(HtmlTransformer.prioritySort);
		}
	}

	addPosthtmlPlugin(extensions, plugin, options = {}) {
		this._add(extensions, "plugins", plugin, options);
	}

	addUrlTransform(extensions, callback, options = {}) {
		this._add(extensions, "callbacks", callback, options);
	}

	setPosthtmlProcessOptions(options) {
		Object.assign(this.posthtmlProcessOptions, options);
	}

	isTransformable(extension, context) {
		return (
			this.getCallbacks(extension, context).length > 0 || this.getPlugins(extension).length > 0
		);
	}

	getCallbacks(extension, context) {
		let callbacks = this.callbacks[extension] || [];
		return callbacks.filter(({ enabled }) => {
			if (!enabled || typeof enabled !== "function") {
				return true;
			}
			return enabled(context);
		});
	}

	getPlugins(extension) {
		let plugins = this.plugins[extension] || [];
		return plugins.filter(({ enabled }) => {
			if (!enabled || typeof enabled !== "function") {
				return true;
			}
			return enabled();
		});
	}

	static async transformStandalone(content, callback, posthtmlProcessOptions = {}) {
		let posthtmlInstance = this._getPosthtmlInstance([
			{
				fn: callback,
				enabled: () => true,
			},
		]);
		let result = await posthtmlInstance.process(content, posthtmlProcessOptions);
		return result.html;
	}

	async transformContent(outputPath, content, context) {
		let extension = FilePathUtil.getFileExtension(outputPath);
		if (!this.isTransformable(extension, context)) {
			return content;
		}

		let bench = this.aggregateBench.get(`Transforming \`${extension}\` with posthtml`);
		bench.before();
		let callbacks = this.getCallbacks(extension, context);
		let plugins = this.getPlugins(extension);
		let posthtmlInstance = HtmlTransformer._getPosthtmlInstance(callbacks, plugins, context);
		let result = await posthtmlInstance.process(content, this.posthtmlProcessOptions);
		bench.after();
		return result.html;
	}
}

export { HtmlTransformer };
