import chalk from "kleur";
import { DateTime } from "luxon";
import yaml from "js-yaml";
import matter from "gray-matter";

import debugUtil from "debug";
import { DeepCopy, TemplatePath } from "@11ty/eleventy-utils";

import HtmlBasePlugin from "./Plugins/HtmlBasePlugin.js";
import RenderPlugin from "./Plugins/RenderPlugin.js";
import InputPathToUrlPlugin from "./Plugins/InputPathToUrl.js";
// import I18nPlugin from "./Plugins/I18nPlugin.js";

import EventEmitter from "./Util/AsyncEventEmitter.js";
import EleventyCompatibility from "./Util/Compatibility.js";
import EleventyBaseError from "./Errors/EleventyBaseError.js";
import BenchmarkManager from "./Benchmark/BenchmarkManager.js";
import JavaScriptFrontMatter from "./Engines/FrontMatter/JavaScript.js";
import { augmentFunction } from "./Engines/Util/ContextAugmenter.js";

const debug = debugUtil("Eleventy:UserConfig");

class UserConfigError extends EleventyBaseError {}

const ComparisonAsyncFunction = (async () => {}).constructor;

/**
 * API to expose configuration options in user-land configuration files
 * @module 11ty/eleventy/UserConfig
 */
class UserConfig {
	#pluginExecution = false;
	#quietModeLocked = false;

	constructor() {
		this._uniqueId = Math.random();
		this.reset();
	}

	// Internally used in TemplateContent for cache keys
	_getUniqueId() {
		return this._uniqueId;
	}

	reset() {
		debug("Resetting EleventyConfig to initial values.");
		this.events = new EventEmitter();

		this.benchmarkManager = new BenchmarkManager();
		this.benchmarks = {
			config: this.benchmarkManager.get("Configuration"),
			aggregate: this.benchmarkManager.get("Aggregate"),
		};

		this.directoryAssignments = {};

		this.collections = {};
		this.precompiledCollections = {};
		this.templateFormats = undefined;
		this.templateFormatsAdded = [];

		this.universal = {
			filters: {},
			shortcodes: {},
			pairedShortcodes: {},
		};

		this.liquid = {
			options: {},
			tags: {},
			filters: {},
			shortcodes: {},
			pairedShortcodes: {},
		};

		this.nunjucks = {
			environmentOptions: {},
			precompiledTemplates: {},
			filters: {},
			asyncFilters: {},
			tags: {},
			globals: {},
			shortcodes: {},
			pairedShortcodes: {},
			asyncShortcodes: {},
			asyncPairedShortcodes: {},
		};

		this.javascript = {
			functions: {},
			filters: {},
			shortcodes: {},
			pairedShortcodes: {},
		};

		this.markdownHighlighter = null;
		this.libraryOverrides = {};

		this.passthroughCopies = {};
		this.layoutAliases = {};
		this.layoutResolution = true; // extension-less layout files

		this.linters = {};
		this.transforms = {};
		this.activeNamespace = "";
		this.DateTime = DateTime;
		this.dynamicPermalinks = true;

		this.useGitIgnore = true;

		let defaultIgnores = new Set();
		defaultIgnores.add("**/node_modules/**");
		defaultIgnores.add(".git/**");
		this.ignores = new Set(defaultIgnores);
		this.watchIgnores = new Set(defaultIgnores);

		this.dataDeepMerge = true;
		this.extensionMap = new Set();
		this.extensionConflictMap = {};
		this.watchJavaScriptDependencies = true;
		this.additionalWatchTargets = [];
		this.serverOptions = {};
		this.globalData = {};
		this.chokidarConfig = {};
		this.watchThrottleWaitTime = 0; //ms

		// using Map to preserve insertion order
		this.dataExtensions = new Map();

		this.quietMode = false;

		this.plugins = [];

		this.useTemplateCache = true;
		this.dataFilterSelectors = new Set();

		this.libraryAmendments = {};
		this.serverPassthroughCopyBehavior = "copy"; // or "passthrough"
		this.urlTransforms = [];

		// Defaults in `defaultConfig.js`
		this.dataFileSuffixesOverride = false;
		this.dataFileDirBaseNameOverride = false;

		this.frontMatterParsingOptions = {
			// Set a project-wide default.
			// language: "yaml",

			// Supplementary engines
			engines: {
				yaml: yaml.load.bind(yaml),

				// Backwards compatible with `js` object front matter
				// https://github.com/11ty/eleventy/issues/2819
				javascript: JavaScriptFrontMatter,

				// Needed for fallback behavior in the new `javascript` engine
				jsLegacy: matter.engines.javascript,

				// for compatibility
				node: JavaScriptFrontMatter,
			},
		};

		this.virtualTemplates = {};
		this.freezeReservedData = true;
		this.customDateParsingCallbacks = new Set();
	}

	// compatibleRange is optional in 2.0.0-beta.2
	versionCheck(compatibleRange) {
		let compat = new EleventyCompatibility(compatibleRange);

		if (!compat.isCompatible()) {
			throw new UserConfigError(compat.getErrorMessage());
		}
	}

	/*
	 * Events
	 */

	// Duplicate event bindings are avoided with the `reset` method above.
	// A new EventEmitter instance is created when the config is reset.
	on(eventName, callback) {
		return this.events.on(eventName, callback);
	}

	emit(eventName, ...args) {
		return this.events.emit(eventName, ...args);
	}

	/*
	 * Universal getters
	 */
	getFilter(name) {
		return this.universal.filters[name];
	}

	getFilters() {
		return this.universal.filters;
	}

	getShortcode(name) {
		return this.universal.shortcodes[name];
	}

	getShortcodes() {
		return this.universal.shortcodes;
	}

	getPairedShortcode(name) {
		return this.universal.pairedShortcodes[name];
	}

	getPairedShortcodes() {
		return this.universal.pairedShortcodes;
	}

	/*
	 * Private utilities
	 */
	#add(target, originalName, callback, options) {
		let { description, functionName } = options;

		if (typeof callback !== "function") {
			throw new Error(`Invalid definition for "${name}" ${description}.`);
		}

		let name = this.getNamespacedName(originalName);

		if (target[name]) {
			debug(
				chalk.yellow(`Warning, overwriting previous ${description} "%o" via \`%o(%o)\``),
				name,
				functionName,
				originalName,
			);
		} else {
			debug(`Adding new ${description} "%o" via \`%o(%o)\``, name, functionName, originalName);
		}

		target[name] = this.#decorateCallback(`"${name}" ${description}`, callback, options);
	}

	#decorateCallback(type, callback) {
		return this.benchmarks.config.add(type, callback);
	}

	/*
	 * Markdown
	 */

	// This is a method for plugins, probably shouldn’t use this in projects.
	// Projects should use `setLibrary` as documented here:
	// https://github.com/11ty/eleventy/blob/master/docs/engines/markdown.md#use-your-own-options
	addMarkdownHighlighter(highlightFn) {
		this.markdownHighlighter = highlightFn;
	}

	/*
	 * Filters
	 */

	addLiquidFilter(name, callback) {
		this.#add(this.liquid.filters, name, callback, {
			description: "Liquid Filter",
			functionName: "addLiquidFilter",
		});
	}

	addNunjucksAsyncFilter(name, callback) {
		this.#add(this.nunjucks.asyncFilters, name, callback, {
			description: "Nunjucks Filter",
			functionName: "addNunjucksAsyncFilter",
		});
	}

	// Support the nunjucks style syntax for asynchronous filter add
	addNunjucksFilter(name, callback, isAsync = false) {
		if (isAsync) {
			// namespacing happens downstream
			this.addNunjucksAsyncFilter(name, callback);
		} else {
			this.#add(this.nunjucks.filters, name, callback, {
				description: "Nunjucks Filter",
				functionName: "addNunjucksFilter",
			});
		}
	}

	addJavaScriptFilter(name, callback) {
		this.#add(this.javascript.filters, name, callback, {
			description: "JavaScript Filter",
			functionName: "addJavaScriptFilter",
		});

		// Backwards compat for a time before `addJavaScriptFilter` existed.
		this.addJavaScriptFunction(name, callback);
	}

	addFilter(name, callback) {
		// This method *requires* `async function` and will not work with `function` that returns a promise
		if (callback instanceof ComparisonAsyncFunction) {
			this.addAsyncFilter(name, callback);
			return;
		}

		// namespacing happens downstream
		this.#add(this.universal.filters, name, callback, {
			description: "Universal Filter",
			functionName: "addFilter",
		});

		this.addLiquidFilter(name, callback);
		this.addJavaScriptFilter(name, callback);
		this.addNunjucksFilter(name, function (...args) {
			// Note that `callback` is already a function as the `#add` method throws an error if not.
			let ret = callback.call(this, ...args);
			if (ret instanceof Promise) {
				throw new Error(
					`Nunjucks *is* async-friendly with \`addFilter("${name}", async function() {})\` but you need to supply an \`async function\`. You returned a promise from \`addFilter("${name}", function() {})\`. Alternatively, use the \`addAsyncFilter("${name}")\` configuration API method.`,
				);
			}
			return ret;
		});
	}

	// Liquid, Nunjucks, and JS only
	addAsyncFilter(name, callback) {
		// namespacing happens downstream
		this.#add(this.universal.filters, name, callback, {
			description: "Universal Filter",
			functionName: "addAsyncFilter",
		});

		this.addLiquidFilter(name, callback);
		this.addJavaScriptFilter(name, callback);
		this.addNunjucksAsyncFilter(name, async function (...args) {
			let cb = args.pop();
			// Note that `callback` is already a function as the `#add` method throws an error if not.
			let ret = await callback.call(this, ...args);
			cb(null, ret);
		});
	}

	/*
	 * Shortcodes
	 */

	addShortcode(name, callback) {
		// This method *requires* `async function` and will not work with `function` that returns a promise
		if (callback instanceof ComparisonAsyncFunction) {
			this.addAsyncShortcode(name, callback);
			return;
		}

		this.#add(this.universal.shortcodes, name, callback, {
			description: "Universal Shortcode",
			functionName: "addShortcode",
		});

		this.addLiquidShortcode(name, callback);
		this.addJavaScriptShortcode(name, callback);
		this.addNunjucksShortcode(name, callback);
	}

	addAsyncShortcode(name, callback) {
		this.#add(this.universal.shortcodes, name, callback, {
			description: "Universal Shortcode",
			functionName: "addAsyncShortcode",
		});

		// Related: #498
		this.addNunjucksAsyncShortcode(name, callback);
		this.addLiquidShortcode(name, callback);
		this.addJavaScriptShortcode(name, callback);
	}

	addNunjucksAsyncShortcode(name, callback) {
		this.#add(this.nunjucks.asyncShortcodes, name, callback, {
			description: "Nunjucks Async Shortcode",
			functionName: "addNunjucksAsyncShortcode",
		});
	}

	addNunjucksShortcode(name, callback, isAsync = false) {
		if (isAsync) {
			this.addNunjucksAsyncShortcode(name, callback);
		} else {
			this.#add(this.nunjucks.shortcodes, name, callback, {
				description: "Nunjucks Shortcode",
				functionName: "addNunjucksShortcode",
			});
		}
	}

	addLiquidShortcode(name, callback) {
		this.#add(this.liquid.shortcodes, name, callback, {
			description: "Liquid Shortcode",
			functionName: "addLiquidShortcode",
		});
	}

	addPairedShortcode(name, callback) {
		// This method *requires* `async function` and will not work with `function` that returns a promise
		if (callback instanceof ComparisonAsyncFunction) {
			this.addPairedAsyncShortcode(name, callback);
			return;
		}

		this.#add(this.universal.pairedShortcodes, name, callback, {
			description: "Universal Paired Shortcode",
			functionName: "addPairedShortcode",
		});

		this.addPairedNunjucksShortcode(name, callback);
		this.addPairedLiquidShortcode(name, callback);
		this.addPairedJavaScriptShortcode(name, callback);
	}

	// Related: #498
	addPairedAsyncShortcode(name, callback) {
		this.#add(this.universal.pairedShortcodes, name, callback, {
			description: "Universal Paired Async Shortcode",
			functionName: "addPairedAsyncShortcode",
		});

		this.addPairedNunjucksAsyncShortcode(name, callback);
		this.addPairedLiquidShortcode(name, callback);
		this.addPairedJavaScriptShortcode(name, callback);
	}

	addPairedNunjucksAsyncShortcode(name, callback) {
		this.#add(this.nunjucks.asyncPairedShortcodes, name, callback, {
			description: "Nunjucks Async Paired Shortcode",
			functionName: "addPairedNunjucksAsyncShortcode",
		});
	}

	addPairedNunjucksShortcode(name, callback, isAsync = false) {
		if (isAsync) {
			this.addPairedNunjucksAsyncShortcode(name, callback);
		} else {
			this.#add(this.nunjucks.pairedShortcodes, name, callback, {
				description: "Nunjucks Paired Shortcode",
				functionName: "addPairedNunjucksShortcode",
			});
		}
	}

	addPairedLiquidShortcode(name, callback) {
		this.#add(this.liquid.pairedShortcodes, name, callback, {
			description: "Liquid Paired Shortcode",
			functionName: "addPairedLiquidShortcode",
		});
	}

	addJavaScriptShortcode(name, callback) {
		this.#add(this.javascript.shortcodes, name, callback, {
			description: "JavaScript Shortcode",
			functionName: "addJavaScriptShortcode",
		});

		// Backwards compat for a time before `addJavaScriptShortcode` existed.
		this.addJavaScriptFunction(name, callback);
	}

	addPairedJavaScriptShortcode(name, callback) {
		this.#add(this.javascript.pairedShortcodes, name, callback, {
			description: "JavaScript Paired Shortcode",
			functionName: "addPairedJavaScriptShortcode",
		});

		// Backwards compat for a time before `addJavaScriptShortcode` existed.
		this.addJavaScriptFunction(name, callback);
	}

	// Both Filters and shortcodes feed into this
	addJavaScriptFunction(name, callback) {
		this.#add(this.javascript.functions, name, callback, {
			description: "JavaScript Function",
			functionName: "addJavaScriptFunction",
		});
	}

	/*
	 * Custom Tags
	 */

	// tagCallback: function(liquidEngine) { return { parse: …, render: … }} };
	addLiquidTag(name, tagFn) {
		if (typeof tagFn !== "function") {
			throw new UserConfigError(
				`EleventyConfig.addLiquidTag expects a callback function to be passed in for ${name}: addLiquidTag(name, function(liquidEngine) { return { parse: …, render: … } })`,
			);
		}

		this.#add(this.liquid.tags, name, tagFn, {
			description: "Liquid Custom Tag",
			functionName: "addLiquidTag",
		});
	}

	addNunjucksTag(name, tagFn) {
		if (typeof tagFn !== "function") {
			throw new UserConfigError(
				`EleventyConfig.addNunjucksTag expects a callback function to be passed in for ${name}: addNunjucksTag(name, function(nunjucksEngine) {})`,
			);
		}

		this.#add(this.nunjucks.tags, name, tagFn, {
			description: "Nunjucks Custom Tag",
			functionName: "addNunjucksTag",
		});
	}

	/*
	 * Plugins
	 */

	// Internal method
	_enablePluginExecution() {
		this.#pluginExecution = true;
	}

	/* Config is executed in two stages and plugins are the second stage—are we in the plugins stage? */
	isPluginExecution() {
		return this.#pluginExecution;
	}

	/* Async friendly in 3.0 */
	addPlugin(plugin, options = {}) {
		// First addPlugin of a unique plugin wins
		if (plugin?.eleventyPluginOptions?.unique && this.hasPlugin(plugin)) {
			debug("Skipping duplicate unique addPlugin for %o", this._getPluginName(plugin));
			return;
		}

		if (this.isPluginExecution() || options?.immediate) {
			// this might return a promise
			return this._executePlugin(plugin, options);
		} else {
			this.plugins.push({
				plugin,
				options,
				pluginNamespace: this.activeNamespace,
			});
		}
	}

	resolvePlugin(name) {
		let filenameLookup = {
			"@11ty/eleventy/html-base-plugin": HtmlBasePlugin,
			"@11ty/eleventy/render-plugin": RenderPlugin,
			"@11ty/eleventy/inputpath-to-url-plugin": InputPathToUrlPlugin,

			// Async plugins:
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

	hasPlugin(plugin) {
		let pluginName;
		if (typeof plugin === "string") {
			pluginName = plugin;
		} else {
			pluginName = this._getPluginName(plugin);
		}
		return this.plugins.some((entry) => this._getPluginName(entry.plugin) === pluginName);
	}

	// Using Function.name https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#examples
	_getPluginName(plugin) {
		if (plugin?.eleventyPackage) {
			return plugin.eleventyPackage;
		}
		if (typeof plugin === "function") {
			return plugin.name;
		}
		if (plugin?.configFunction && typeof plugin.configFunction === "function") {
			return plugin.configFunction.name;
		}
	}

	// Starting in 3.0 the plugin callback might be asynchronous!
	_executePlugin(plugin, options) {
		let name = this._getPluginName(plugin);
		let ret;
		debug(`Adding %o plugin`, name || "anonymous");
		let pluginBenchmark = this.benchmarks.aggregate.get("Configuration addPlugin");

		if (typeof plugin === "function") {
			pluginBenchmark.before();
			this.benchmarks.config;
			let configFunction = plugin;
			ret = configFunction(this, options);
			pluginBenchmark.after();
		} else if (plugin?.configFunction) {
			pluginBenchmark.before();

			if (options && typeof options.init === "function") {
				// init is not yet async-friendly but it’s also barely used
				options.init.call(this, plugin.initArguments || {});
			}

			ret = plugin.configFunction(this, options);
			pluginBenchmark.after();
		} else {
			throw new UserConfigError(
				"Invalid EleventyConfig.addPlugin signature. Should be a function or a valid Eleventy plugin object.",
			);
		}
		return ret;
	}

	getNamespacedName(name) {
		return this.activeNamespace + name;
	}

	async namespace(pluginNamespace, callback) {
		let validNamespace = pluginNamespace && typeof pluginNamespace === "string";
		if (validNamespace) {
			this.activeNamespace = pluginNamespace || "";
		}

		await callback(this);

		if (validNamespace) {
			this.activeNamespace = "";
		}
	}

	/**
	 * Adds a path to a file or directory to the list of pass-through copies
	 * which are copied as-is to the output.
	 *
	 * @param {string|object} fileOrDir The path to the file or directory that should
	 * be copied. OR an object where the key is the input glob and the property is the output directory
	 * @param {object} copyOptions options for recursive-copy.
	 * see https://www.npmjs.com/package/recursive-copy#arguments
	 * default options are defined in TemplatePassthrough copyOptionsDefault
	 * @returns {any} a reference to the `EleventyConfig` object.
	 * @memberof EleventyConfig
	 */
	addPassthroughCopy(fileOrDir, copyOptions = {}) {
		if (typeof fileOrDir === "string") {
			this.passthroughCopies[fileOrDir] = { outputPath: true, copyOptions };
		} else {
			for (let [inputPath, outputPath] of Object.entries(fileOrDir)) {
				this.passthroughCopies[inputPath] = { outputPath, copyOptions };
			}
		}

		return this;
	}

	/*
	 * Template Formats
	 */
	_normalizeTemplateFormats() {
		throw new Error("The internal _normalizeTemplateFormats() method was removed in Eleventy 3.0");
	}

	setTemplateFormats(templateFormats) {
		this.templateFormats = templateFormats;
	}

	// additive, usually for plugins
	addTemplateFormats(templateFormats) {
		this.templateFormatsAdded.push(templateFormats);
	}

	/*
	 * Library Overrides and Options
	 */
	setLibrary(engineName, libraryInstance) {
		if (engineName === "liquid" && Object.keys(this.liquid.options).length) {
			debug(
				"WARNING: using `eleventyConfig.setLibrary` will override any configuration set using `.setLiquidOptions` via the config API. You’ll need to pass these options to the library yourself.",
			);
		} else if (engineName === "njk" && Object.keys(this.nunjucks.environmentOptions).length) {
			debug(
				"WARNING: using `eleventyConfig.setLibrary` will override any configuration set using `.setNunjucksEnvironmentOptions` via the config API. You’ll need to pass these options to the library yourself.",
			);
		}

		this.libraryOverrides[engineName.toLowerCase()] = libraryInstance;
	}

	/* These callbacks run on both libraryOverrides and default library instances */
	amendLibrary(engineName, callback) {
		let name = engineName.toLowerCase();
		if (!this.libraryAmendments[name]) {
			this.libraryAmendments[name] = [];
		}

		this.libraryAmendments[name].push(callback);
	}

	setLiquidOptions(options) {
		this.liquid.options = options;
	}

	setNunjucksEnvironmentOptions(options) {
		this.nunjucks.environmentOptions = options;
	}

	setNunjucksPrecompiledTemplates(templates) {
		this.nunjucks.precompiledTemplates = templates;
	}

	setDynamicPermalinks(enabled) {
		this.dynamicPermalinks = !!enabled;
	}

	setUseGitIgnore(enabled) {
		this.useGitIgnore = !!enabled;
	}

	setDataDeepMerge(deepMerge) {
		this._dataDeepMergeModified = true;
		this.dataDeepMerge = !!deepMerge;
	}

	isDataDeepMergeModified() {
		return this._dataDeepMergeModified;
	}

	addWatchTarget(additionalWatchTargets) {
		this.additionalWatchTargets.push(additionalWatchTargets);
	}

	setWatchJavaScriptDependencies(watchEnabled) {
		this.watchJavaScriptDependencies = !!watchEnabled;
	}

	setServerOptions(options = {}, override = false) {
		if (override) {
			this.serverOptions = options;
		} else {
			this.serverOptions = DeepCopy(this.serverOptions, options);
		}
	}

	setBrowserSyncConfig() {
		this._attemptedBrowserSyncUse = true;
		debug(
			"The `setBrowserSyncConfig` method was removed in Eleventy 2.0.0. Use `setServerOptions` with the new Eleventy development server or the `@11ty/eleventy-browser-sync` plugin moving forward.",
		);
	}

	setChokidarConfig(options = {}) {
		this.chokidarConfig = options;
	}

	setWatchThrottleWaitTime(time = 0) {
		this.watchThrottleWaitTime = time;
	}

	// 3.0 change: this does a top level merge instead of reset.
	setFrontMatterParsingOptions(options = {}) {
		DeepCopy(this.frontMatterParsingOptions, options);
	}

	/* Internal method for CLI --quiet */
	_setQuietModeOverride(quietMode) {
		this.setQuietMode(quietMode);
		this.#quietModeLocked = true;
	}

	setQuietMode(quietMode) {
		if (this.#quietModeLocked) {
			debug(
				"Attempt to `setQuietMode(%o)` ignored, --quiet command line argument override in place.",
				!!quietMode,
			);
			// override via CLI takes precedence
			return;
		}

		this.quietMode = !!quietMode;
	}

	addExtension(fileExtension, options = {}) {
		let extensions;

		// Array support added in 2.0.0-canary.19
		if (Array.isArray(fileExtension)) {
			extensions = fileExtension;
		} else {
			// single string
			extensions = [fileExtension];
		}

		for (let extension of extensions) {
			if (this.extensionConflictMap[extension]) {
				throw new Error(
					`An attempt was made to override the "${extension}" template syntax twice (via the \`addExtension\` configuration API). A maximum of one override is currently supported.`,
				);
			}
			this.extensionConflictMap[extension] = true;

			let extensionOptions = Object.assign(
				{
					// Might be overridden for aliasing in options.key
					key: extension,
					extension: extension,
				},
				options,
			);

			if (extensionOptions.key !== extensionOptions.extension) {
				extensionOptions.aliasKey = extensionOptions.extension;
			}

			this.extensionMap.add(extensionOptions);
		}
	}

	addDataExtension(extensionList, parser) {
		let options = {};
		// second argument is an object with a `parser` callback
		if (typeof parser !== "function") {
			if (!("parser" in parser)) {
				throw new Error(
					"Expected `parser` property in second argument object to `eleventyConfig.addDataExtension`",
				);
			}

			options = parser;
			parser = options.parser;
		}

		let extensions = extensionList.split(",").map((s) => s.trim());
		for (let extension of extensions) {
			this.dataExtensions.set(extension, {
				extension,
				parser,
				options,
			});
		}
	}

	setUseTemplateCache(bypass) {
		this.useTemplateCache = !!bypass;
	}

	setPrecompiledCollections(collections) {
		this.precompiledCollections = collections;
	}

	// "passthrough" is the default, no other value is explicitly required in code
	// but opt-out via "copy" is suggested
	setServerPassthroughCopyBehavior(behavior) {
		this.serverPassthroughCopyBehavior = behavior;
	}

	addUrlTransform(callback) {
		this.urlTransforms.push(callback);
	}

	setDataFileSuffixes(suffixArray) {
		this.dataFileSuffixesOverride = suffixArray;
	}

	setDataFileBaseName(baseName) {
		this.dataFileDirBaseNameOverride = baseName;
	}

	addTemplate(virtualInputPath, content, data) {
		// Lookups keys must be normalized
		virtualInputPath = TemplatePath.stripLeadingDotSlash(
			TemplatePath.standardizeFilePath(virtualInputPath),
		);
		if (this.virtualTemplates[virtualInputPath]) {
			throw new Error(
				"Virtual template conflict: you can’t add multiple virtual templates that have the same inputPath: " +
					virtualInputPath,
			);
		}

		this.virtualTemplates[virtualInputPath] = {
			inputPath: virtualInputPath,
			data,
			content,
		};
	}

	isVirtualTemplate(virtualInputPath) {
		return Boolean(this.virtualTemplates[virtualInputPath]);
	}

	#setDirectory(key, dir) {
		if (this.isPluginExecution()) {
			throw new Error(
				"The `set*Directory` configuration API methods are not yet allowed in plugins.",
			);
		}
		this.directoryAssignments[key] = dir;
	}

	setInputDirectory(dir) {
		this.#setDirectory("input", dir);
	}

	setOutputDirectory(dir) {
		this.#setDirectory("output", dir);
	}

	setDataDirectory(dir) {
		this.#setDirectory("data", dir);
	}

	setIncludesDirectory(dir) {
		this.#setDirectory("includes", dir);
	}

	setLayoutsDirectory(dir) {
		this.#setDirectory("layouts", dir);
	}

	// Some data keywords in Eleventy are reserved, throw an error if an application tries to set these.
	setFreezeReservedData(bool) {
		this.freezeReservedData = !!bool;
	}

	addDateParsing(callback) {
		if (typeof callback === "function") {
			this.customDateParsingCallbacks.add(callback);
		} else {
			throw new Error("addDateParsing expects a function argument.");
		}
	}

	addGlobalData(name, data) {
		name = this.getNamespacedName(name);
		this.globalData[name] = data;
		return this;
	}

	addNunjucksGlobal(name, globalType) {
		name = this.getNamespacedName(name);

		if (this.nunjucks.globals[name]) {
			debug(
				chalk.yellow("Warning, overwriting a Nunjucks global with `addNunjucksGlobal(%o)`"),
				name,
			);
		}

		if (typeof globalType === "function") {
			this.nunjucks.globals[name] = this.#decorateCallback(`"${name}" Nunjucks Global`, globalType);
		} else {
			this.nunjucks.globals[name] = globalType;
		}
	}

	addTransform(name, callback) {
		name = this.getNamespacedName(name);

		this.transforms[name] = this.#decorateCallback(`"${name}" Transform`, callback);
	}

	addLinter(name, callback) {
		name = this.getNamespacedName(name);

		this.linters[name] = this.#decorateCallback(`"${name}" Linter`, callback);
	}

	addLayoutAlias(from, to) {
		this.layoutAliases[from] = to;
	}

	setLayoutResolution(resolution) {
		this.layoutResolution = !!resolution;
	}

	// compat
	enableLayoutResolution() {
		this.layoutResolution = true;
	}

	/*
	 * Collections
	 */

	// get config defined collections
	getCollections() {
		return this.collections;
	}

	addCollection(name, callback) {
		name = this.getNamespacedName(name);

		if (this.collections[name]) {
			throw new UserConfigError(
				`config.addCollection(${name}) already exists. Try a different name for your collection.`,
			);
		}

		this.collections[name] = callback;
	}

	augmentFunctionContext(fn, options) {
		let t = typeof fn;
		if (t !== "function") {
			throw new UserConfigError(
				"Invalid type passed to `augmentFunctionContext`—function was expected and received: " + t,
			);
		}

		return augmentFunction(fn, options);
	}

	getMergingConfigObject() {
		let obj = {
			// filters removed in 1.0 (use addTransform instead)
			transforms: this.transforms,
			linters: this.linters,
			globalData: this.globalData,
			layoutAliases: this.layoutAliases,
			layoutResolution: this.layoutResolution,
			passthroughCopies: this.passthroughCopies,

			// Liquid
			liquidOptions: this.liquid.options,
			liquidTags: this.liquid.tags,
			liquidFilters: this.liquid.filters,
			liquidShortcodes: this.liquid.shortcodes,
			liquidPairedShortcodes: this.liquid.pairedShortcodes,

			// Nunjucks
			nunjucksEnvironmentOptions: this.nunjucks.environmentOptions,
			nunjucksPrecompiledTemplates: this.nunjucks.precompiledTemplates,
			nunjucksFilters: this.nunjucks.filters,
			nunjucksAsyncFilters: this.nunjucks.asyncFilters,
			nunjucksTags: this.nunjucks.tags,
			nunjucksGlobals: this.nunjucks.globals,
			nunjucksAsyncShortcodes: this.nunjucks.asyncShortcodes,
			nunjucksShortcodes: this.nunjucks.shortcodes,
			nunjucksAsyncPairedShortcodes: this.nunjucks.asyncPairedShortcodes,
			nunjucksPairedShortcodes: this.nunjucks.pairedShortcodes,

			// 11ty.js
			javascriptFunctions: this.javascript.functions, // filters and shortcodes, combined
			javascriptShortcodes: this.javascript.shortcodes,
			javascriptPairedShortcodes: this.javascript.pairedShortcodes,
			javascriptFilters: this.javascript.filters,

			// Markdown
			markdownHighlighter: this.markdownHighlighter,

			libraryOverrides: this.libraryOverrides,
			dynamicPermalinks: this.dynamicPermalinks,
			useGitIgnore: this.useGitIgnore,
			ignores: this.ignores,
			watchIgnores: this.watchIgnores,
			dataDeepMerge: this.dataDeepMerge,
			watchJavaScriptDependencies: this.watchJavaScriptDependencies,
			additionalWatchTargets: this.additionalWatchTargets,
			serverOptions: this.serverOptions,
			chokidarConfig: this.chokidarConfig,
			watchThrottleWaitTime: this.watchThrottleWaitTime,
			frontMatterParsingOptions: this.frontMatterParsingOptions,
			dataExtensions: this.dataExtensions,
			extensionMap: this.extensionMap,
			quietMode: this.quietMode,
			events: this.events,
			benchmarkManager: this.benchmarkManager,
			plugins: this.plugins,
			useTemplateCache: this.useTemplateCache,
			precompiledCollections: this.precompiledCollections,
			dataFilterSelectors: this.dataFilterSelectors,
			libraryAmendments: this.libraryAmendments,
			serverPassthroughCopyBehavior: this.serverPassthroughCopyBehavior,
			urlTransforms: this.urlTransforms,
			virtualTemplates: this.virtualTemplates,
			// `directories` and `directoryAssignments` are merged manually prior to plugin processing
			freezeReservedData: this.freezeReservedData,
			customDateParsing: this.customDateParsingCallbacks,
		};

		if (Array.isArray(this.dataFileSuffixesOverride)) {
			// no upstream merging of this array, so we add the override: prefix
			obj["override:dataFileSuffixes"] = this.dataFileSuffixesOverride;
		}

		if (this.dataFileDirBaseNameOverride) {
			obj.dataFileDirBaseNameOverride = this.dataFileDirBaseNameOverride;
		}

		return obj;
	}

	// No-op functions for backwards compat
	addHandlebarsHelper() {}
	setPugOptions() {}
	setEjsOptions() {}
	addHandlebarsShortcode() {}
	addPairedHandlebarsShortcode() {}
}

export default UserConfig;
