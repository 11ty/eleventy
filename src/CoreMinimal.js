import debugUtil from "debug";
import { isPlainObject, TemplatePath } from "@11ty/eleventy-utils";

import chalk from "./Adapters/Packages/chalk.js";

import TemplateData from "./Data/TemplateData.js";
import TemplateWriter from "./TemplateWriter.js";
import EleventyExtensionMap from "./EleventyExtensionMap.js";
import { EleventyErrorHandler } from "./Errors/EleventyErrorHandler.js";
import TemplateConfig from "./TemplateConfig.js";
import TemplateEngineManager from "./Engines/TemplateEngineManager.js";

/* Utils */
import { readableFileSize } from "./Util/FileSize.js";
import simplePlural from "./Util/Pluralize.js";
import ConsoleLogger from "./Util/ConsoleLogger.js";
import ProjectDirectories from "./Util/ProjectDirectories.js";
import {
	getEleventyPackageJson,
	importJsonSync,
	getWorkingProjectPackageJsonPath,
} from "./Util/ImportJsonSync.js";
import ProjectTemplateFormats from "./Util/ProjectTemplateFormats.js";

const pkg = getEleventyPackageJson();
const debug = debugUtil("Eleventy");

/**
 * Eleventy’s programmatic API
 * @module 11ty/eleventy/Eleventy
 */

export class MinimalCore {
	/**
	 * Userspace package.json file contents
	 * @type {object|undefined}
	 */
	#projectPackageJson;
	/** @type {string} */
	#projectPackageJsonPath;
	/** @type {ProjectTemplateFormats|undefined} */
	#templateFormats;
	/** @type {ConsoleLogger|undefined} */
	#logger;
	/** @type {ProjectDirectories|undefined} */
	#directories;
	/** @type {boolean|undefined} */
	#verboseOverride;
	/** @type {boolean} */
	#isVerboseMode = true;
	/** @type {boolean|undefined} */
	#preInitVerbose;
	/** @type {boolean} */
	#hasConfigInitialized = false;
	/** @type {boolean} */
	#needsInit = true;
	/** @type {Promise|undefined} */
	#initPromise;
	/** @type {EleventyErrorHandler|undefined} */
	#errorHandler;
	/** @type {Map} */
	#privateCaches = new Map();
	/** @type {boolean|undefined} */
	#isEsm;
	/** @type {string} */
	#activeConfigurationPath;

	// Support both new Eleventy(options) and new Eleventy(input, output, options)
	#normalizeConstructorArguments(...args) {
		let input;
		let output;
		let options;
		let eleventyConfig;

		if (isPlainObject(args[0])) {
			options = args[0] || {};
			input = options.input;
			output = options.output;
			eleventyConfig = args[1];
		} else {
			input = args[0];
			output = args[1];
			options = args[2] || {};
			eleventyConfig = args[3];
		}

		return {
			input,
			output,
			options,
			eleventyConfig,
		};
	}

	/**
	 * @typedef {object} EleventyOptions
	 * @property {'cli'|'script'=} source
	 * @property {'build'|'serve'|'watch'=} runMode
	 * @property {boolean=} dryRun
	 * @property {string=} configPath
	 * @property {string=} pathPrefix
	 * @property {boolean=} quietMode
	 * @property {Function=} config
	 * @property {string=} inputDir

	 * @param {string} [input] - Directory or filename for input/sources files.
	 * @param {string} [output] - Directory serving as the target for writing the output files.
	 * @param {EleventyOptions} [options={}]
	 * @param {TemplateConfig} [eleventyConfig]
	 */
	constructor(...args) {
		let {
			input,
			output,
			options = {},
			eleventyConfig = null,
		} = this.#normalizeConstructorArguments(...args);

		/**
		 * @type {string|undefined}
		 * @description Holds the path to the input (might be a file or folder)
		 */
		this.rawInput = input || undefined;

		/**
		 * @type {string|undefined}
		 * @description holds the path to the output directory
		 */
		this.rawOutput = output || undefined;

		/**
		 * @type {module:11ty/eleventy/TemplateConfig}
		 * @description Override the config instance (for centralized config re-use)
		 */
		this.eleventyConfig = eleventyConfig;

		/**
		 * @type {EleventyOptions}
		 * @description Options object passed to the Eleventy constructor
		 * @default {}
		 */
		this.options = options;

		/**
		 * @type {'cli'|'script'}
		 * @description Called via CLI (`cli`) or Programmatically (`script`)
		 * @default "script"
		 */
		this.source = options.source || "script";

		/**
		 * @type {string}
		 * @description One of build, serve, or watch
		 * @default "build"
		 */
		this.runMode = options.runMode || "build";

		/**
		 * @type {boolean}
		 * @description Is Eleventy running in dry mode?
		 * @default false
		 */
		this.isDryRun = options.dryRun ?? false;

		/**
		 * @type {boolean}
		 * @description Is this an incremental build? (only operates on a subset of input files)
		 * @default false
		 */
		this.isIncremental = false;

		/**
		 * @type {string|undefined}
		 * @description If an incremental build, this is the file we’re operating on.
		 * @default null
		 */
		this.programmaticApiIncrementalFile = undefined;

		/**
		 * @type {boolean}
		 * @description Should we process files on first run? (The --ignore-initial feature)
		 * @default true
		 */
		this.isRunInitialBuild = true;

		/**
		 * @type {Number}
		 * @description Number of builds run on this instance.
		 * @default 0
		 */
		this.buildCount = 0;

		/**
		 * @member {String} - Force ESM or CJS mode instead of detecting from package.json. Either cjs, esm, or auto.
		 * @default "auto"
		 */
		this.loader = this.options.loader ?? "auto";

		/**
		 * @type {Number}
		 * @description The timestamp of Eleventy start.
		 */
		this.start = this.getNewTimestamp();
	}

	/**
	 * @type {string|undefined}
	 * @description An override of Eleventy's default config file paths
	 * @default undefined
	 */
	get configPath() {
		return this.options.configPath;
	}

	/**
	 * @type {string}
	 * @description The top level directory the site pretends to reside in
	 * @default "/"
	 */
	get pathPrefix() {
		return this.options.pathPrefix || "/";
	}

	/**
	 * Reads the version of Eleventy.
	 *
	 * @static
	 * @returns {string} - The version of Eleventy.
	 */
	static getVersion() {
		return pkg.version;
	}

	/**
	 * @deprecated since 1.0.1, use static Eleventy.getVersion()
	 */
	getVersion() {
		return MinimalCore.getVersion();
	}

	async initializeConfig(initOverrides) {
		if (!this.eleventyConfig) {
			this.eleventyConfig = new TemplateConfig(null, this.configPath);
		} else if (this.configPath) {
			await this.eleventyConfig.setProjectConfigPath(this.configPath);
		}

		this.#activeConfigurationPath =
			this.configPath ?? this.eleventyConfig.getLocalProjectConfigFile();

		this.eleventyConfig.setRunMode(this.runMode);
		this.eleventyConfig.setProjectUsingEsm(this.isEsm);
		this.eleventyConfig.setLogger(this.logger);
		this.eleventyConfig.setDirectories(this.directories);
		this.eleventyConfig.setTemplateFormats(this.templateFormats);

		if (this.pathPrefix || this.pathPrefix === "") {
			this.eleventyConfig.setPathPrefix(this.pathPrefix);
		}

		// Debug mode should always run quiet (all output goes to debug logger)
		if (process.env.DEBUG) {
			this.#verboseOverride = false;
		} else if (this.options.quietMode === true || this.options.quietMode === false) {
			this.#verboseOverride = !this.options.quietMode;
		}

		// Moved before config merges: https://github.com/11ty/eleventy/issues/3316
		if (this.#verboseOverride === true || this.#verboseOverride === false) {
			this.eleventyConfig.userConfig._setQuietModeOverride(!this.#verboseOverride);
		}

		this.eleventyConfig.userConfig.directories = this.directories;

		/* Programmatic API config */
		if (this.options.config && typeof this.options.config === "function") {
			debug("Running options.config configuration callback (passed to Eleventy constructor)");
			// TODO use return object here?
			await this.options.config(this.eleventyConfig.userConfig);
		}

		/**
		 * @type {object}
		 * @description Initialize Eleventy environment variables
		 * @default null
		 */
		// this.runMode need to be set before this
		this.env = this.getEnvironmentVariableValues();
		this.initializeEnvironmentVariables(this.env);

		// Async initialization of configuration
		await this.eleventyConfig.init(initOverrides);

		/**
		 * @type {object}
		 * @description Initialize Eleventy’s configuration, including the user config file
		 */
		this.config = this.eleventyConfig.getConfig();

		/**
		 * @type {object}
		 * @description Singleton BenchmarkManager instance
		 */
		this.bench = this.config.benchmarkManager;

		if (performance) {
			debug("Eleventy warm up time: %o (ms)", performance.now());
		}

		this.#hasConfigInitialized = true;

		// after #hasConfigInitialized above
		this.setIsVerbose(this.#preInitVerbose ?? !this.config.quietMode);
	}

	getNewTimestamp() {
		if (performance) {
			return performance.now();
		}
		return new Date().getTime();
	}

	/** @type {ProjectDirectories} */
	get directories() {
		if (!this.#directories) {
			this.#directories = new ProjectDirectories();
			this.#directories.setInput(this.rawInput, this.options.inputDir);
			this.#directories.setOutput(this.rawOutput);

			if (this.source == "cli" && (this.rawInput !== undefined || this.rawOutput !== undefined)) {
				this.#directories.freeze();
			}
		}

		return this.#directories;
	}

	/** @type {string} */
	get input() {
		return this.directories.inputFile || this.directories.input || this.config.dir.input;
	}

	/** @type {string} */
	get inputFile() {
		return this.directories.inputFile;
	}

	/** @type {string} */
	get inputDir() {
		return this.directories.input;
	}

	// Not used internally, removed in 3.0.
	setInputDir() {
		throw new Error(
			"Eleventy->setInputDir was removed in 3.0. Use the inputDir option to the constructor",
		);
	}

	/** @type {string} */
	get outputDir() {
		return this.directories.output || this.config.dir.output;
	}

	/**
	 * Updates the dry-run mode of Eleventy.
	 *
	 * @param {boolean} isDryRun - Shall Eleventy run in dry mode?
	 */
	setDryRun(isDryRun) {
		this.isDryRun = !!isDryRun;
	}

	/**
	 * Sets the incremental build mode.
	 *
	 * @param {boolean} isIncremental - Shall Eleventy run in incremental build mode and only write the files that trigger watch updates
	 */
	setIncrementalBuild(isIncremental) {
		this.isIncremental = !!isIncremental;

		if (this.writer) {
			this.writer.setIncrementalBuild(this.isIncremental);
		}
	}

	/**
	 * Set whether or not to do an initial build
	 *
	 * @param {boolean} ignoreInitialBuild - Shall Eleventy ignore the default initial build before watching in watch/serve mode?
	 * @default true
	 */
	setIgnoreInitial(ignoreInitialBuild) {
		this.isRunInitialBuild = !ignoreInitialBuild;

		if (this.writer) {
			this.writer.setRunInitialBuild(this.isRunInitialBuild);
		}
	}

	/**
	 * Updates the path prefix used in the config.
	 *
	 * @param {string} pathPrefix - The new path prefix.
	 */
	setPathPrefix(pathPrefix) {
		if (pathPrefix || pathPrefix === "") {
			this.eleventyConfig.setPathPrefix(pathPrefix);
			// TODO reset config
			// this.config = this.eleventyConfig.getConfig();
		}
	}

	/**
	 * Restarts Eleventy.
	 */
	async restart() {
		debug("Restarting.");
		this.start = this.getNewTimestamp();

		this.extensionMap.reset();
		this.bench.reset();
	}

	#cache(key, inst) {
		if (!("caches" in inst)) {
			throw new Error("To use #cache you need a `caches` getter object");
		}

		// Restore from cache
		if (this.#privateCaches.has(key)) {
			let c = this.#privateCaches.get(key);
			for (let cacheKey in c) {
				inst[cacheKey] = c[cacheKey];
			}
		} else {
			// Set cache
			let c = {};
			for (let cacheKey of inst.caches || []) {
				c[cacheKey] = inst[cacheKey];
			}
			this.#privateCaches.set(key, c);
		}
	}

	/**
	 * Starts Eleventy.
	 */
	async init(options = {}) {
		let { viaConfigReset } = Object.assign({ viaConfigReset: false }, options);
		if (!this.#hasConfigInitialized) {
			await this.initializeConfig();
		} else {
			// Note: Global event bus is different from user config event bus
			this.config.events.reset();
		}

		await this.config.events.emit("eleventy.config", this.eleventyConfig);

		if (this.env) {
			await this.config.events.emit("eleventy.env", this.env);
		}

		let formats = this.templateFormats.getTemplateFormats();
		let engineManager = new TemplateEngineManager(this.eleventyConfig);
		this.extensionMap = new EleventyExtensionMap(this.eleventyConfig);
		this.extensionMap.setFormats(formats);
		this.extensionMap.engineManager = engineManager;
		await this.config.events.emit("eleventy.extensionmap", this.extensionMap);

		this.templateData = new TemplateData(this.eleventyConfig);
		this.templateData.setProjectUsingEsm(this.isEsm);
		this.templateData.extensionMap = this.extensionMap;
		if (this.env) {
			this.templateData.environmentVariables = this.env;
		}

		// Note these directories are all project root relative
		this.config.events.emit("eleventy.directories", this.directories.getUserspaceInstance());

		this.writer = new TemplateWriter(formats, this.templateData, this.eleventyConfig);

		if (!viaConfigReset) {
			// set or restore cache
			this.#cache("TemplateWriter", this.writer);
		}

		this.writer.logger = this.logger;
		this.writer.extensionMap = this.extensionMap;
		this.writer.setRunInitialBuild(this.isRunInitialBuild);
		this.writer.setIncrementalBuild(this.isIncremental);

		let debugStr = `Directories:
  Input:
    Directory: ${this.directories.input}
    File: ${this.directories.inputFile || false}
    Glob: ${this.directories.inputGlob || false}
  Data: ${this.directories.data}
  Includes: ${this.directories.includes}
  Layouts: ${this.directories.layouts || false}
  Output: ${this.directories.output}
Template Formats: ${formats.join(",")}
Verbose Output: ${this.verboseMode}`;
		debug(debugStr);

		this.writer.setVerboseOutput(this.verboseMode);
		this.writer.setDryRun(this.isDryRun);

		this.#needsInit = false;
	}

	// These are all set as initial global data under eleventy.env.* (see TemplateData->environmentVariables)
	getEnvironmentVariableValues() {
		let values = {
			source: this.source,
			runMode: this.runMode,
		};

		if (this.#activeConfigurationPath) {
			values.config = TemplatePath.absolutePath(this.#activeConfigurationPath);
		}

		// Fixed: instead of configuration directory, explicit root or working directory
		values.root = TemplatePath.getWorkingDir();

		values.source = this.source;

		// Backwards compatibility
		Object.defineProperty(values, "isServerless", {
			enumerable: false,
			value: false,
		});

		return values;
	}

	/**
	 * Set process.ENV variables for use in Eleventy projects
	 *
	 * @method
	 */
	initializeEnvironmentVariables(env) {
		// Recognize that global data `eleventy.version` is coerced to remove prerelease tags
		// and this is the raw version (3.0.0 versus 3.0.0-alpha.6).
		// `eleventy.env.version` does not yet exist (unnecessary)
		process.env.ELEVENTY_VERSION = MinimalCore.getVersion();

		process.env.ELEVENTY_ROOT = env.root;
		debug("Setting process.env.ELEVENTY_ROOT: %o", env.root);

		process.env.ELEVENTY_SOURCE = env.source;
		process.env.ELEVENTY_RUN_MODE = env.runMode;
	}

	/** @param {boolean} value */
	set verboseMode(value) {
		this.setIsVerbose(value);
	}

	/** @type {boolean} */
	get verboseMode() {
		return this.#isVerboseMode;
	}

	/** @type {ConsoleLogger} */
	get logger() {
		if (!this.#logger) {
			this.#logger = new ConsoleLogger();
			this.#logger.isVerbose = this.verboseMode;
		}

		return this.#logger;
	}

	/** @param {ConsoleLogger} logger */
	set logger(logger) {
		this.eleventyConfig.setLogger(logger);
		this.#logger = logger;
	}

	disableLogger() {
		this.logger.overrideLogger(false);
	}

	/** @type {EleventyErrorHandler} */
	get errorHandler() {
		if (!this.#errorHandler) {
			this.#errorHandler = new EleventyErrorHandler();
			this.#errorHandler.isVerbose = this.verboseMode;
			this.#errorHandler.logger = this.logger;
		}

		return this.#errorHandler;
	}

	/**
	 * Updates the verbose mode of Eleventy.
	 *
	 * @method
	 * @param {boolean} isVerbose - Shall Eleventy run in verbose mode?
	 */
	setIsVerbose(isVerbose) {
		if (!this.#hasConfigInitialized) {
			this.#preInitVerbose = !!isVerbose;
			return;
		}

		// always defer to --quiet if override happened
		isVerbose = this.#verboseOverride ?? !!isVerbose;

		this.#isVerboseMode = isVerbose;

		if (this.logger) {
			this.logger.isVerbose = isVerbose;
		}

		this.bench.setVerboseOutput(isVerbose);

		if (this.writer) {
			this.writer.setVerboseOutput(isVerbose);
		}

		if (this.errorHandler) {
			this.errorHandler.isVerbose = isVerbose;
		}

		// Set verbose mode in config file
		this.eleventyConfig.verbose = isVerbose;
	}

	get templateFormats() {
		if (!this.#templateFormats) {
			let tf = new ProjectTemplateFormats();
			this.#templateFormats = tf;
		}

		return this.#templateFormats;
	}

	/**
	 * Updates the template formats of Eleventy.
	 *
	 * @method
	 * @param {string} formats - The new template formats.
	 */
	setFormats(formats) {
		this.templateFormats.setViaCommandLine(formats);
	}

	/**
	 * Updates the run mode of Eleventy.
	 *
	 * @method
	 * @param {string} runMode - One of "build", "watch", or "serve"
	 */
	setRunMode(runMode) {
		this.runMode = runMode;
	}

	/**
	 * Set the file that needs to be rendered/compiled/written for an incremental build.
	 * This method is also wired up to the CLI --incremental=incrementalFile
	 *
	 * @method
	 * @param {string} incrementalFile - File path (added or modified in a project)
	 */
	setIncrementalFile(incrementalFile) {
		if (incrementalFile) {
			// This used to also setIgnoreInitial(true) but was changed in 3.0.0-alpha.14
			this.setIncrementalBuild(true);

			this.programmaticApiIncrementalFile = TemplatePath.addLeadingDotSlash(incrementalFile);

			// Used to determind template relevance for compile cache keys
			this.eleventyConfig.setPreviousBuildModifiedFile(incrementalFile);
		}
	}

	unsetIncrementalFile() {
		// only applies to initial build, no re-runs (--watch/--serve)
		if (this.programmaticApiIncrementalFile) {
			// this.setIgnoreInitial(false);
			this.programmaticApiIncrementalFile = undefined;
		}

		// reset back to false
		this.setIgnoreInitial(false);
	}

	/**
	 * Resets the config of Eleventy.
	 *
	 * @method
	 */
	async resetConfig() {
		delete this.eleventyConfig;

		// ensures `initializeConfig()` will run when `init()` is called next
		this.#hasConfigInitialized = false;
	}

	// fetch from project’s package.json
	get projectPackageJsonPath() {
		if (this.#projectPackageJsonPath === undefined) {
			this.#projectPackageJsonPath = getWorkingProjectPackageJsonPath() || false;
		}
		return this.#projectPackageJsonPath;
	}

	get projectPackageJson() {
		if (!this.#projectPackageJson) {
			let p = this.projectPackageJsonPath;
			this.#projectPackageJson = p ? importJsonSync(p) : {};
		}
		return this.#projectPackageJson;
	}

	get isEsm() {
		if (this.#isEsm !== undefined) {
			return this.#isEsm;
		}
		if (this.loader == "esm") {
			this.#isEsm = true;
		} else if (this.loader == "cjs") {
			this.#isEsm = false;
		} else if (this.loader == "auto") {
			this.#isEsm = this.projectPackageJson?.type === "module";
		} else {
			throw new Error("The 'loader' option must be one of 'esm', 'cjs', or 'auto'");
		}
		return this.#isEsm;
	}

	/**
	 * Writes templates to the file system.
	 *
	 * @async
	 * @method
	 * @param {String} subtype - (optional) or "templates" (skips passthrough copy) or "copy" (skips templates)
	 * @returns {Promise<{Array}>}
	 */
	async write(subtype) {
		if (subtype) {
			if (subtype !== "fs" && !subtype?.startsWith("fs:")) {
				subtype = `fs:${subtype}`;
			}
			return this.executeBuild(subtype);
		}

		return this.executeBuild("fs");
	}

	/**
	 * Renders templates to a JSON object.
	 *
	 * @async
	 * @method
	 * @returns {Promise<{Array}>}
	 */
	async toJSON() {
		return this.executeBuild("json");
	}

	toNDJSON() {
		throw new Error("Feature removed in Eleventy v4: https://github.com/11ty/eleventy/issues/3382");
	}

	/**
	 * tbd.
	 *
	 * @async
	 * @method
	 * @returns {Promise<{Array}>} ret - tbd.
	 */
	async executeBuild(to = "fs") {
		if (this.#needsInit) {
			if (!this.#initPromise) {
				this.#initPromise = this.init();
			}
			await this.#initPromise.then(() => {
				// #needsInit also set to false at the end of `init()`
				this.#needsInit = false;
				this.#initPromise = undefined;
			});
		}

		if (!this.writer) {
			throw new Error(
				"Internal error: Eleventy didn’t run init() properly and wasn’t able to create a TemplateWriter.",
			);
		}

		let incrementalFile =
			this.programmaticApiIncrementalFile || this.watchQueue?.getIncrementalFile();
		if (incrementalFile) {
			this.writer.setIncrementalFile(incrementalFile);
		}

		let returnObj;
		let hasError = false;
		let outputMode = String(to);
		// normalize fs:templates or fs:copy to `fs`
		if (outputMode.includes(":")) {
			outputMode = outputMode.split(":").shift();
		}

		try {
			let directories = this.directories.getUserspaceInstance();
			let eventsArg = {
				directories,

				// v3.0.0-alpha.6, changed to use `directories` instead (this was only used by serverless plugin)
				inputDir: directories.input,

				// Deprecated (not normalized) use `directories` instead.
				dir: this.config.dir,

				runMode: this.runMode,
				outputMode,
				incremental: this.isIncremental,
			};

			await this.config.events.emit("beforeBuild", eventsArg);
			await this.config.events.emit("eleventy.before", eventsArg);

			let promise;
			if (to === "fs") {
				promise = this.writer.write();
			} else if (to === "fs:templates") {
				promise = this.writer.writeTemplates();
			} else if (to === "json") {
				promise = this.writer.getJSON("json");
			} else {
				throw new Error(
					`Invalid argument for \`Eleventy->executeBuild(${to})\`, expected "json", "fs", or "fs:templates".`,
				);
			}

			let resolved = await promise;

			// Passing the processed output to the eleventy.after event (2.0+)
			eventsArg.results = resolved.templates;

			if (to === "json" || to === "fs:templates") {
				// Backwards compat
				returnObj = resolved.templates;
			} else {
				// Backwards compat
				returnObj = [resolved.passthroughCopy, resolved.templates];
			}

			this.unsetIncrementalFile();
			this.writer.resetIncrementalFile();

			eventsArg.uses = this.eleventyConfig.usesGraph.map;
			await this.config.events.emit("afterBuild", eventsArg);
			await this.config.events.emit("eleventy.after", eventsArg);

			this.buildCount++;
		} catch (error) {
			hasError = true;

			// Issue #2405: Don’t change the exitCode for programmatic scripts
			let errorSeverity = this.source === "script" ? "error" : "fatal";
			this.errorHandler.once(errorSeverity, error, "Problem writing Eleventy templates");

			throw error;
		} finally {
			this.bench.finish();

			if (outputMode === "fs") {
				this.logger.logWithOptions({
					message: this.logFinished(),
					color: hasError ? "red" : "green",
					force: true,
				});
			}

			debug("Finished.");

			debug(`
Have a suggestion/feature request/feedback? Feeling frustrated? I want to hear it!
Open an issue: https://github.com/11ty/eleventy/issues/new`);
		}

		return returnObj;
	}

	/**
	 * Logs some statistics after a complete run of Eleventy.
	 *
	 * @returns {string} ret - The log message.
	 */
	logFinished() {
		if (!this.writer) {
			throw new Error(
				"Did you call Eleventy.init to create the TemplateWriter instance? Hint: you probably didn’t.",
			);
		}

		let ret = [];

		let {
			copyCount,
			copySize,
			skipCount,
			writeCount,
			// renderCount, // files that render (costly) but may not write to disk
		} = this.writer.getMetadata();

		let slashRet = [];

		if (copyCount) {
			debug("Total passthrough copy aggregate size: %o", readableFileSize(copySize));
			slashRet.push(`Copied ${chalk.bold(copyCount)}`);
		}

		slashRet.push(
			`Wrote ${chalk.bold(writeCount)} ${simplePlural(writeCount, "file", "files")}${
				skipCount ? ` (skipped ${skipCount})` : ""
			}`,
		);

		// slashRet.push(
		// 	`${renderCount} rendered`
		// )

		if (slashRet.length) {
			ret.push(slashRet.join(" "));
		}

		let time = (this.getNewTimestamp() - this.start) / 1000;
		ret.push(
			`in ${chalk.bold(time.toFixed(2))} ${simplePlural(time.toFixed(2), "second", "seconds")}`,
		);

		// More than 1 second total, show estimate of per-template time
		if (time >= 1 && writeCount > 1) {
			ret.push(`(${((time * 1000) / writeCount).toFixed(1)}ms each, v${pkg.version})`);
		} else {
			ret.push(`(v${MinimalCore.getVersion()})`);
		}

		if (!this.#activeConfigurationPath) {
			ret.push("(no config file)");
		}

		return ret.join(" ");
	}
}
