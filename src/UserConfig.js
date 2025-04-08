import chalk from "kleur";
import { DateTime } from "luxon";
import yaml from "js-yaml";
import matter from "gray-matter";
import debugUtil from "debug";

import { DeepCopy, TemplatePath, isPlainObject } from "@11ty/eleventy-utils";

import HtmlBasePlugin from "./Plugins/HtmlBasePlugin.js";
import RenderPlugin from "./Plugins/RenderPlugin.js";
import InputPathToUrlPlugin from "./Plugins/InputPathToUrl.js";

import isAsyncFunction from "./Util/IsAsyncFunction.js";
import objectFilter from "./Util/Objects/ObjectFilter.js";
import EventEmitter from "./Util/AsyncEventEmitter.js";
import EleventyCompatibility from "./Util/Compatibility.js";
import EleventyBaseError from "./Errors/EleventyBaseError.js";
import BenchmarkManager from "./Benchmark/BenchmarkManager.js";
import JavaScriptFrontMatter from "./Engines/FrontMatter/JavaScript.js";
import { augmentFunction } from "./Engines/Util/ContextAugmenter.js";

const debug = debugUtil("Eleventy:UserConfig");

class UserConfigError extends EleventyBaseError {}

/**
 * Eleventy’s user-land Configuration API
 * @module 11ty/eleventy/UserConfig
 */
class UserConfig {
	/** @type {boolean} */
	#pluginExecution = false;
	/** @type {boolean} */
	#quietModeLocked = false;
	/** @type {boolean} */
	#dataDeepMergeModified = false;
	/** @type {number|undefined} */
	#uniqueId;
	/** @type {number} */
	#concurrency = 1;
	// Before using os.availableParallelism(); see https://github.com/11ty/eleventy/issues/3596

	constructor() {
		// These are completely unnecessary lines to satisfy TypeScript
		this.plugins = [];
		this.templateFormatsAdded = [];
		this.additionalWatchTargets = [];
		this.watchTargetsConfigReset = new Set();
		this.extensionMap = new Set();
		this.dataExtensions = new Map();
		this.urlTransforms = [];
		this.customDateParsingCallbacks = new Set();
		this.ignores = new Set();
		this.events = new EventEmitter();

		/** @type {object} */
		this.directories = {};
		/** @type {undefined} */
		this.logger;
		/** @type {string} */
		this.dir;
		/** @type {string} */
		this.pathPrefix;
		/** @type {object} */
		this.errorReporting = {};
		/** @type {object} */
		this.templateHandling = {};

		this.reset();
		this.#uniqueId = Math.random();
	}

	// Internally used in TemplateContent for cache keys
	_getUniqueId() {
		return this.#uniqueId;
	}

	reset() {
		debug("Resetting EleventyConfig to initial values.");

		/** @type {EventEmitter} */
		this.events = new EventEmitter();
		this.events.setMaxListeners(25); // defaults to 10

		/** @type {BenchmarkManager} */
		this.benchmarkManager = new BenchmarkManager();

		/** @type {object} */
		this.benchmarks = {
			/** @type {import('./Benchmark/BenchmarkGroup.js')} */
			config: this.benchmarkManager.get("Configuration"),
			/** @type {import('./Benchmark/BenchmarkGroup.js')} */
			aggregate: this.benchmarkManager.get("Aggregate"),
		};

		/** @type {object} */
		this.directoryAssignments = {};
		/** @type {object} */
		this.collections = {};
		/** @type {object} */
		this.precompiledCollections = {};
		this.templateFormats = undefined;
		this.templateFormatsAdded = [];

		/** @type {object} */
		this.universal = {
			filters: {},
			shortcodes: {},
			pairedShortcodes: {},
		};

		/** @type {object} */
		this.liquid = {
			options: {},
			tags: {},
			filters: {},
			shortcodes: {},
			pairedShortcodes: {},
			parameterParsing: "legacy", // or builtin
		};

		/** @type {object} */
		this.nunjucks = {
			// `dev: true` gives us better error messaging
			environmentOptions: { dev: true },
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

		/** @type {object} */
		this.javascript = {
			functions: {},
			filters: {},
			shortcodes: {},
			pairedShortcodes: {},
		};

		this.markdownHighlighter = null;

		/** @type {object} */
		this.libraryOverrides = {};

		/** @type {object} */
		this.passthroughCopies = {};
		this.passthroughCopiesHtmlRelative = new Set();

		/** @type {object} */
		this.layoutAliases = {};
		this.layoutResolution = true; // extension-less layout files

		/** @type {object} */
		this.linters = {};
		/** @type {object} */
		this.transforms = {};
		/** @type {object} */
		this.preprocessors = {};

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
		/** @type {object} */
		this.extensionConflictMap = {};
		this.watchJavaScriptDependencies = true;
		this.additionalWatchTargets = [];
		this.watchTargetsConfigReset = new Set();
		/** @type {object} */
		this.serverOptions = {};
		/** @type {object} */
		this.globalData = {};
		/** @type {object} */
		this.chokidarConfig = {};
		this.watchThrottleWaitTime = 0; //ms

		// using Map to preserve insertion order
		this.dataExtensions = new Map();

		this.quietMode = false;

		this.plugins = [];

		this.useTemplateCache = true;
		this.dataFilterSelectors = new Set();

		/** @type {object} */
		this.libraryAmendments = {};
		this.serverPassthroughCopyBehavior = "copy"; // or "passthrough"
		this.urlTransforms = [];

		// Defaults in `defaultConfig.js`
		this.dataFileSuffixesOverride = false;
		this.dataFileDirBaseNameOverride = false;

		/** @type {object} */
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
				// @ts-ignore
				jsLegacy: matter.engines.javascript,

				node: function () {
					throw new Error(
						"The `node` front matter type was a 3.0.0-alpha.x only feature, removed for stable release. Rename to `js` or `javascript` instead!",
					);
				},
			},
		};

		/** @type {object} */
		this.virtualTemplates = {};
		this.freezeReservedData = true;
		this.customDateParsingCallbacks = new Set();

		/** @type {object} */
		this.errorReporting = {};
		/** @type {object} */
		this.templateHandling = {};

		// Before using os.availableParallelism(); see https://github.com/11ty/eleventy/issues/3596
		this.#concurrency = 1;
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

	once(eventName, callback) {
		return this.events.once(eventName, callback);
	}

	emit(eventName, ...args) {
		return this.events.emit(eventName, ...args);
	}

	setEventEmitterMode(mode) {
		this.events.setHandlerMode(mode);
	}

	/*
	 * Universal getters
	 */
	getFilter(name) {
		// JavaScript functions are included here for backwards compatibility https://github.com/11ty/eleventy/issues/3365
		return this.universal.filters[name] || this.javascript.functions[name];
	}

	getFilters(options = {}) {
		let working = this.universal.filters;
		if (options.type) {
			working = objectFilter(
				this.universal.filters,
				(entry) => entry.__eleventyInternal?.type === options.type,
			);
		}
		if (options.lang) {
			working = objectFilter(
				working,
				(entry) =>
					entry.__eleventyInternal?.langs?.includes(options.lang) ||
					entry.__eleventyInternal?.langs === undefined,
			);
		}

		return working;
	}

	getShortcode(name) {
		return this.universal.shortcodes[name];
	}

	getShortcodes(options = {}) {
		if (options.type) {
			return objectFilter(
				this.universal.shortcodes,
				(entry) => entry.__eleventyInternal?.type === options.type,
			);
		}

		return this.universal.shortcodes;
	}

	getPairedShortcode(name) {
		return this.universal.pairedShortcodes[name];
	}

	getPairedShortcodes(options = {}) {
		if (options.type) {
			return objectFilter(
				this.universal.pairedShortcodes,
				(entry) => entry.__eleventyInternal?.type === options.type,
			);
		}
		return this.universal.pairedShortcodes;
	}

	/*
	 * Private utilities
	 */
	#add(target, originalName, callback, options) {
		let { description, functionName } = options;

		if (typeof callback !== "function") {
			throw new Error(`Invalid definition for "${originalName}" ${description}.`);
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

		target[name] = this.#decorateCallback(
			`"${name}" ${description}`,
			callback,
			options,
		);
	}

	#decorateCallback(type, callback, misc) {
		return this.benchmarks.config.add(type, callback, misc);
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

	/**
	 * @deprecated Use {@link addFilter} instead, with options.langs set to ["liquid"] if you wish it to be scoped.
	 */
	addLiquidFilter(name, callback) {
		this.logger.warn(
			'`addLiquidFilter` is deprecated and will be removed in a future release.\
			 Use `addFilter` instead, with options.lang set to ["liquid"] if you wish it to be scoped.',
		);
		this.addFilter(
			name,
			callback,
			{
				langs: ["liquid"],
			},
		);
	}

	/**
	 * @deprecated Use {@link addFilter} instead, with options.langs set to ["njk"] if you wish it to be scoped.
	 */
	addNunjucksAsyncFilter(name, callback) {
		this.logger.warn(
			'`addNunjucksAsyncFilter` is deprecated and will be removed in a future release.\
			 Pass an async function to `addFilter` instead, with options.lang set to ["njk"] if you wish it to be scoped.',
		);
		this.addFilter(name, callback, {
			langs: ["njk"],
			async: true,
		});
	}

	// Support the nunjucks style syntax for asynchronous filter add
	/**
	 * @deprecated Use {@link addFilter} instead, with options.langs set to ["njk"] if you wish it to be scoped.
	 */
	addNunjucksFilter(name, callback, isAsync = false) {
		if (isAsync) {
			this.addNunjucksAsyncFilter(name, callback);
			return;
		}
		this.logger.warn(
			'`addNunjucksFilter` is deprecated and will be removed in a future release.\
			 Use `addFilter` instead, with options.langs set to ["njk"] if you wish it to be scoped.',
		);
		this.addFilter(
			name,
			callback,
			{
				langs: ["njk"],
			},
		);
	}

	addJavaScriptFilter(name, callback) {
		this.#add(this.javascript.filters, name, callback, {
			description: "JavaScript Filter",
			functionName: "addJavaScriptFilter",
		});

		// Backwards compat for a time before `addJavaScriptFilter` existed.
		this.addJavaScriptFunction(name, callback);
	}

	/**
	 *
	 * @param {*} name - The name of the filter
	 * @param {*} callback - The filter function
	 * @param {{
	 * 	langs?: string[],
	 * 	async?: boolean
	 * }} [options] - Options for the filter
	 * If `async` is undefined, it attempt to be determined.
	 * @returns
	 */
	addFilter(name, callback, options) {
		const async = options?.async || isAsyncFunction(callback);

		// namespacing happens downstream
		this.#add(this.universal.filters, name, callback, {
			description: "Universal Filter",
			functionName: "addFilter",
			langs: options?.langs,
			async,
		});

		this.addJavaScriptFilter(name, callback);
	}

	/**
	 * Perhaps this should be deprecated.
	 * addAsyncFilter("...", function() {return Promise}) and
	 * addFilter("...", function() {return Promise}, {async: true})
	 * are the same.
	 */
	addAsyncFilter(name, callback) {
		this.addFilter(name, callback, {
			async: true,
		});
	}

	/*
	 * Shortcodes
	 */

	addShortcode(name, callback) {
		// This method *requires* `async function` and will not work with `function` that returns a promise
		if (isAsyncFunction(callback)) {
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
		if (isAsyncFunction(callback)) {
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

	// Internal method
	_disablePluginExecution() {
		this.#pluginExecution = false;
	}

	/* Config is executed in two stages and plugins are the second stage—are we in the plugins stage? */
	isPluginExecution() {
		return this.#pluginExecution;
	}

	/**
	 * @typedef {function|Promise<function>|object} PluginDefinition
	 * @property {Function} [configFunction]
	 * @property {string} [eleventyPackage]
	 * @property {object} [eleventyPluginOptions={}]
	 * @property {boolean} [eleventyPluginOptions.unique]
	 */

	/**
	 * addPlugin: async friendly in 3.0
	 *
	 * @param {PluginDefinition} plugin
	 */
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

	/** @param {string} name */
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

	/** @param {string|PluginDefinition} plugin */
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
	/** @param {PluginDefinition} plugin */
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

	/** @param {string} name */
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
	 */
	addPassthroughCopy(fileOrDir, copyOptions = {}) {
		if (copyOptions.mode) {
			if (copyOptions.mode !== "html-relative") {
				throw new Error(
					"Invalid `mode` option for `addPassthroughCopy`. Received: '" + copyOptions.mode + "'",
				);
			}
			if (isPlainObject(fileOrDir)) {
				throw new Error(
					"mode: 'html-relative' does not yet support passthrough copy objects (input -> output mapping). Use a string glob or an Array of string globs.",
				);
			}

			this.passthroughCopiesHtmlRelative?.add({
				match: fileOrDir,
				...copyOptions,
			});
		} else if (typeof fileOrDir === "string") {
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

	setLiquidParameterParsing(behavior) {
		if (behavior !== "legacy" && behavior !== "builtin") {
			throw new Error(
				`Invalid argument passed to \`setLiquidParameterParsing\`. Expected one of "legacy" or "builtin".`,
			);
		}
		this.liquid.parameterParsing = behavior;
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
		this.#dataDeepMergeModified = true;
		this.dataDeepMerge = !!deepMerge;
	}

	// Used by the Upgrade Helper Plugin
	isDataDeepMergeModified() {
		return this.#dataDeepMergeModified;
	}

	addWatchTarget(additionalWatchTargets, options = {}) {
		// Reset the config when the target path changes
		if (options.resetConfig) {
			this.watchTargetsConfigReset.add(additionalWatchTargets);
		}

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

			/** @type {object} */
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

	// Url transforms change page.url and work good with server side content-negotiation (e.g. i18n plugin)
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

	// 3.0.0-alpha.18 started merging conflicts here (when possible), issue #3389
	addGlobalData(name, data) {
		name = this.getNamespacedName(name);
		if (this.globalData[name]) {
			if (isPlainObject(this.globalData[name]) && isPlainObject(data)) {
				DeepCopy(this.globalData[name], data);
			} else {
				debug("Warning: overwriting a previous value set with addGlobalData(%o)", name);
				this.globalData[name] = data;
			}
		} else {
			this.globalData[name] = data;
		}
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

	addPreprocessor(name, fileExtensions, callback) {
		name = this.getNamespacedName(name);

		this.preprocessors[name] = {
			filter: fileExtensions,
			callback: this.#decorateCallback(`"${name}" Preprocessor`, callback),
		};
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

	configureErrorReporting(options = {}) {
		// allowMissingExtensions: true
		Object.assign(this.errorReporting, options);
	}

	configureTemplateHandling(options = {}) {
		// writeMode: "sync" // "async"
		Object.assign(this.templateHandling, options);
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

	setConcurrency(number) {
		if (typeof number !== "number") {
			throw new UserConfigError("Argument passed to `setConcurrency` must be a number.");
		}

		this.#concurrency = number;
	}

	getConcurrency() {
		return this.#concurrency;
	}

	getMergingConfigObject() {
		let obj = {
			// filters removed in 1.0 (use addTransform instead)
			transforms: this.transforms,
			linters: this.linters,
			preprocessors: this.preprocessors,
			globalData: this.globalData,
			layoutAliases: this.layoutAliases,
			layoutResolution: this.layoutResolution,
			passthroughCopiesHtmlRelative: this.passthroughCopiesHtmlRelative,
			passthroughCopies: this.passthroughCopies,

			// Liquid
			liquidOptions: this.liquid.options,
			liquidTags: this.liquid.tags,
			liquidShortcodes: this.liquid.shortcodes,
			liquidPairedShortcodes: this.liquid.pairedShortcodes,
			liquidParameterParsing: this.liquid.parameterParsing,

			// Nunjucks
			nunjucksEnvironmentOptions: this.nunjucks.environmentOptions,
			nunjucksPrecompiledTemplates: this.nunjucks.precompiledTemplates,
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
			watchTargetsConfigReset: this.watchTargetsConfigReset,
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
			collectionApiNames: Object.keys(this.collections),
			dataFilterSelectors: this.dataFilterSelectors,
			libraryAmendments: this.libraryAmendments,
			serverPassthroughCopyBehavior: this.serverPassthroughCopyBehavior,
			urlTransforms: this.urlTransforms,
			virtualTemplates: this.virtualTemplates,
			// `directories` and `directoryAssignments` are merged manually prior to plugin processing
			freezeReservedData: this.freezeReservedData,
			customDateParsing: this.customDateParsingCallbacks,
			errorReporting: this.errorReporting,
			templateHandling: this.templateHandling,
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
