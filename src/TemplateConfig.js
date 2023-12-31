import fs from "node:fs";
import chalk from "kleur";
import { TemplatePath } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import { EleventyImport, EleventyImportFromEleventy } from "./Util/Require.js";
import EleventyBaseError from "./EleventyBaseError.js";
import UserConfig from "./UserConfig.js";
import GlobalDependencyMap from "./GlobalDependencyMap.js";
import ExistsCache from "./Util/ExistsCache.js";
import merge from "./Util/Merge.js";
import unique from "./Util/Unique.js";
import eventBus from "./EventBus.js";

const debug = debugUtil("Eleventy:TemplateConfig");
const debugDev = debugUtil("Dev:Eleventy:TemplateConfig");

/**
 * @module 11ty/eleventy/TemplateConfig
 */

/**
 * Config as used by the template.
 * @typedef {Object} module:11ty/eleventy/TemplateConfig~TemplateConfig~config
 * @property {String=} pathPrefix - The path prefix.
 */

/**
 * Object holding override information for the template config.
 * @typedef {Object} module:11ty/eleventy/TemplateConfig~TemplateConfig~override
 * @property {String=} pathPrefix - The path prefix.
 */

/**
 * Errors in eleventy config.
 * @ignore
 */
class EleventyConfigError extends EleventyBaseError {}

/**
 * Errors in eleventy plugins.
 * @ignore
 */
class EleventyPluginError extends EleventyBaseError {}

/**
 * Config for a template.
 * @ignore
 * @param {{}} customRootConfig - tbd.
 * @param {String} projectConfigPath - Path to local project config.
 */
class TemplateConfig {
	constructor(customRootConfig, projectConfigPath) {
		this.userConfig = new UserConfig();

		/** @member {module:11ty/eleventy/TemplateConfig~TemplateConfig~override} - tbd. */
		this.overrides = {};

		/**
		 * @member {String} - Path to local project config.
		 * @default .eleventy.js
		 */
		if (projectConfigPath !== undefined) {
			if (!projectConfigPath) {
				// falsy skips config files
				this.projectConfigPaths = [];
			} else {
				this.projectConfigPaths = [projectConfigPath];
			}
		} else {
			this.projectConfigPaths = [
				".eleventy.js",
				"eleventy.config.js",
				"eleventy.config.mjs",
				"eleventy.config.cjs",
			];
		}

		if (customRootConfig) {
			/**
			 * @member {?{}} - Custom root config.
			 */
			this.customRootConfig = customRootConfig;
			debug("Warning: Using custom root config!");
		} else {
			this.customRootConfig = null;
		}

		this.hasConfigMerged = false;
		this.isEsm = false;
	}

	/* Setter for Logger */
	setLogger(logger) {
		this.logger = logger;
	}

	/**
	 * Normalises local project config file path.
	 *
	 * @method
	 * @returns {String} - The normalised local project config file path.
	 */
	getLocalProjectConfigFile() {
		let configFiles = this.getLocalProjectConfigFiles();
		// Add the configFiles[0] in case of a test, where no file exists on the file system
		let configFile = configFiles.find((path) => path && fs.existsSync(path)) || configFiles[0];
		if (configFile) {
			return configFile;
		}
	}

	getLocalProjectConfigFiles() {
		if (this.projectConfigPaths && this.projectConfigPaths.length > 0) {
			return TemplatePath.addLeadingDotSlashArray(this.projectConfigPaths.filter((path) => path));
		}
		return [];
	}

	get inputDir() {
		return this._inputDir;
	}

	set inputDir(inputDir) {
		this._inputDir = inputDir;
	}

	setProjectUsingEsm(isEsmProject) {
		this.isEsm = !!isEsmProject;
	}

	getIsProjectUsingEsm() {
		return this.isEsm;
	}

	/**
	 * Resets the configuration.
	 */
	async reset() {
		debugDev("Resetting configuration: TemplateConfig and UserConfig.");
		this.userConfig.reset();
		// await this.initializeRootConfig();
		await this.forceReloadConfig();
		this.usesGraph.reset();

		// Clear the compile cache
		eventBus.emit("eleventy.compileCacheReset");
	}

	/**
	 * Resets the configuration while in watch mode.
	 *
	 * @todo Add implementation.
	 */
	resetOnWatch() {
		// nothing yet
	}

	/**
	 * Async-friendly init method
	 */
	async init(overrides) {
		await this.initializeRootConfig();
		if (overrides) {
			this.appendToRootConfig(overrides);
		}

		this.config = await this.mergeConfig();
		this.hasConfigMerged = true;
	}

	/**
	 * Force a reload of the configuration object.
	 */
	async forceReloadConfig() {
		this.hasConfigMerged = false;
		await this.init();
	}

	/**
	 * Returns the config object.
	 *
	 * @returns {{}} - The config object.
	 */
	getConfig() {
		if (!this.hasConfigMerged) {
			throw new Error("Invalid call to .getConfig(). Needs an .init() first.");
		}
		return this.config;
	}

	/**
	 * Overwrites the config path.
	 *
	 * @param {String} path - The new config path.
	 */
	async setProjectConfigPath(path) {
		if (path !== undefined) {
			this.projectConfigPaths = [path];
		} else {
			this.projectConfigPaths = [];
		}

		if (this.hasConfigMerged) {
			// merge it again
			debugDev("Merging in getConfig again after setting the local project config path.");
			await this.forceReloadConfig();
		}
	}

	/**
	 * Overwrites the path prefix.
	 *
	 * @param {String} pathPrefix - The new path prefix.
	 */
	setPathPrefix(pathPrefix) {
		if (pathPrefix && pathPrefix !== "/") {
			debug("Setting pathPrefix to %o", pathPrefix);
			this.overrides.pathPrefix = pathPrefix;
		}
	}

	/**
	 * Gets the current path prefix denoting the root folder the output will be deployed to
	 *
	 *  @returns {String} - The path prefix string
	 */
	getPathPrefix() {
		if (this.overrides.pathPrefix) {
			return this.overrides.pathPrefix;
		}

		if (!this.hasConfigMerged) {
			throw new Error("Config has not yet merged. Needs `init()`.");
		}

		return this.config.pathPrefix;
	}

	/**
	 * Bootstraps the config object.
	 */
	async initializeRootConfig() {
		this.rootConfig =
			this.customRootConfig || (await EleventyImportFromEleventy("./src/defaultConfig.js"));

		if (typeof this.rootConfig === "function") {
			this.rootConfig = this.rootConfig.call(this, this.userConfig);
			// debug( "rootConfig is a function, after calling, this.userConfig is %o", this.userConfig );
		}

		debug("rootConfig %o", this.rootConfig);
	}

	/*
	 * Add additional overrides to the root config object, used for testing
	 *
	 * @param {Object} - a subset of the return Object from the user’s config file.
	 */
	appendToRootConfig(obj) {
		Object.assign(this.rootConfig, obj);
	}

	/*
	 * Process the userland plugins from the Config
	 *
	 * @param {Object} - the return Object from the user’s config file.
	 */
	async processPlugins({ dir, pathPrefix }) {
		this.userConfig.dir = dir;
		this.userConfig.pathPrefix = pathPrefix;

		if (this.logger) {
			this.userConfig.logger = this.logger;
		}

		// for Nested addPlugin calls, Issue #1925
		this.userConfig._enablePluginExecution();

		let storedActiveNamespace = this.userConfig.activeNamespace;
		for (let { plugin, options, pluginNamespace } of this.userConfig.plugins) {
			try {
				this.userConfig.activeNamespace = pluginNamespace;
				await this.userConfig._executePlugin(plugin, options);
			} catch (e) {
				let name = this.userConfig._getPluginName(plugin);
				let namespaces = [storedActiveNamespace, pluginNamespace].filter((entry) => !!entry);

				let namespaceStr = "";
				if (namespaces.length) {
					namespaceStr = ` (namespace: ${namespaces.join(".")})`;
				}

				throw new EleventyPluginError(
					`Error processing ${name ? `the \`${name}\`` : "a"} plugin${namespaceStr}`,
					e,
				);
			}
		}

		this.userConfig.activeNamespace = storedActiveNamespace;
	}

	/**
	 * Fetches and executes the local configuration file
	 *
	 * @returns {{}} merged - The merged config file object.
	 */
	async requireLocalConfigFile() {
		let localConfig = {};
		let path = this.projectConfigPaths.filter((path) => path).find((path) => fs.existsSync(path));

		debug(`Merging config with ${path}`);

		if (path) {
			try {
				localConfig = await EleventyImport(path, this.isEsm ? "esm" : "cjs");
				// debug( "localConfig require return value: %o", localConfig );
				if (typeof localConfig === "function") {
					localConfig = await localConfig(this.userConfig);
					// debug( "localConfig is a function, after calling, this.userConfig is %o", this.userConfig );
				}

				// Still using removed `filters`? this was renamed to transforms
				if (
					localConfig &&
					localConfig.filters !== undefined &&
					Object.keys(localConfig.filters).length
				) {
					throw new EleventyConfigError(
						"The `filters` configuration option was renamed in Eleventy 0.3.3 and removed in Eleventy 1.0. Please use the `addTransform` configuration method instead. Read more: https://www.11ty.dev/docs/config/#transforms",
					);
				}
			} catch (err) {
				// TODO the error message here is bad and I feel bad (needs more accurate info)
				throw new EleventyConfigError(
					`Error in your Eleventy config file '${path}'.` +
						(err.message && err.message.includes("Cannot find module")
							? chalk.cyan(" You may need to run `npm install`.")
							: ""),
					err,
				);
			}
		} else {
			debug("Eleventy local project config file not found, skipping.");
		}

		return localConfig;
	}

	/**
	 * Merges different config files together.
	 *
	 * @param {String} projectConfigPath - Path to project config.
	 * @returns {{}} merged - The merged config file.
	 */
	async mergeConfig() {
		let localConfig = await this.requireLocalConfigFile();

		// Template Formats:
		// 1. Root Config (usually defaultConfig.js)
		// 2. Local Config return object (project .eleventy.js)
		// 3.
		let templateFormats = this.rootConfig.templateFormats || [];
		if (localConfig && localConfig.templateFormats) {
			templateFormats = localConfig.templateFormats;
			delete localConfig.templateFormats;
		}

		let mergedConfig = merge({}, this.rootConfig, localConfig);

		// Setup a few properties for plugins:

		// Setup pathPrefix set via command line for plugin consumption
		if (this.overrides.pathPrefix) {
			mergedConfig.pathPrefix = this.overrides.pathPrefix;
		}

		// Returning a falsy value (e.g. "") from user config should reset to the default value.
		if (!mergedConfig.pathPrefix) {
			mergedConfig.pathPrefix = this.rootConfig.pathPrefix;
		}

		// Delay processing plugins until after the result of localConfig is returned
		// But BEFORE the rest of the config options are merged
		// this way we can pass directories and other template information to plugins

		// Temporarily restore templateFormats
		mergedConfig.templateFormats = templateFormats;

		await this.userConfig.events.emit("eleventy.beforeConfig", this.userConfig);

		let benchmarkManager = this.userConfig.benchmarkManager.get("Aggregate");
		let pluginsBench = benchmarkManager.get("Processing plugins in config");
		pluginsBench.before();
		await this.processPlugins(mergedConfig);
		pluginsBench.after();

		delete mergedConfig.templateFormats;

		let eleventyConfigApiMergingObject = this.userConfig.getMergingConfigObject();

		// `templateFormats` is an override via `setTemplateFormats`
		// `templateFormatsAdded` is additive via `addTemplateFormats`
		if (eleventyConfigApiMergingObject && eleventyConfigApiMergingObject.templateFormats) {
			templateFormats = eleventyConfigApiMergingObject.templateFormats;
			delete eleventyConfigApiMergingObject.templateFormats;
		}

		let templateFormatsAdded = eleventyConfigApiMergingObject.templateFormatsAdded || [];
		delete eleventyConfigApiMergingObject.templateFormatsAdded;

		templateFormats = unique([...templateFormats, ...templateFormatsAdded]);

		merge(mergedConfig, eleventyConfigApiMergingObject);

		// Apply overrides, currently only pathPrefix uses this I think!
		debug("overrides: %o", this.overrides);
		merge(mergedConfig, this.overrides);

		// Restore templateFormats
		mergedConfig.templateFormats = templateFormats;

		debug("Current configuration: %o", mergedConfig);

		this.afterConfigMergeActions(mergedConfig);

		return mergedConfig;
	}

	get usesGraph() {
		if (!this._usesGraph) {
			this._usesGraph = new GlobalDependencyMap();
		}
		return this._usesGraph;
	}

	afterConfigMergeActions(eleventyConfig) {
		// Add to the merged config too
		eleventyConfig.uses = this.usesGraph;

		// this is used for the layouts event
		this.usesGraph.setConfig(eleventyConfig);
	}

	get uses() {
		if (!this.usesGraph) {
			throw new Error("The Eleventy Global Dependency Graph has not yet been initialized.");
		}
		return this.usesGraph;
	}

	get existsCache() {
		if (!this._existsCache) {
			this._existsCache = new ExistsCache();
			this._existsCache.setDirectoryCheck(true);
		}
		return this._existsCache;
	}
}

export default TemplateConfig;
