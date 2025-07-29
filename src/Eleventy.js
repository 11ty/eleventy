import { relative } from "node:path";
import debugUtil from "debug";

import { TemplatePath } from "@11ty/eleventy-utils";

import { Core } from "./Core.js";
import EleventyServe from "./EleventyServe.js";
import EleventyWatch from "./EleventyWatch.js";
import WatchTargets from "./EleventyWatchTargets.js";
import EleventyBaseError from "./Errors/EleventyBaseError.js";

// Utils
import checkPassthroughCopyBehavior from "./Util/PassthroughCopyBehaviorCheck.js";
import PathPrefixer from "./Util/PathPrefixer.js";
import PathNormalizer from "./Util/PathNormalizer.js";
import { isGlobMatch } from "./Util/GlobMatcher.js";
import eventBus from "./EventBus.js";
import { withResolvers } from "./Util/PromiseUtil.js";
import GlobRemap from "./Util/GlobRemap.js";

const debug = debugUtil("Eleventy");

export default class Eleventy extends Core {
	/** @type {boolean} */
	#isStopping = false;

	/** @type {module:chokidar} */
	#chokidar;

	/** @type {EleventyWatch} */
	#watchManager;

	// constructor(input, output, options = {}, eleventyConfig = null) {
	// 	super(input, output, options, eleventyConfig);
	// }

	/**
	 * Sets the incremental build mode.
	 *
	 * @param {boolean} isIncremental - Shall Eleventy run in incremental build mode and only write the files that trigger watch updates
	 */
	setIncrementalBuild(isIncremental) {
		super.setIncrementalBuild(isIncremental);

		if (this.#watchManager) {
			this.watchManager.incremental = !!isIncremental;
		}
	}

	get watchManager() {
		if (!this.#watchManager) {
			this.#watchManager = new EleventyWatch();
			this.#watchManager.incremental = this.isIncremental;
		}
		return this.#watchManager;
	}

	async initializeConfig(initOverrides) {
		await super.initializeConfig(initOverrides);

		// Careful to make sure the previous server closes on SIGINT, issue #3873
		if (!this.eleventyServe) {
			/** @type {object} */
			this.eleventyServe = new EleventyServe();
		}
		this.eleventyServe.eleventyConfig = this.eleventyConfig;

		/** @type {object} */
		this.watchTargets = new WatchTargets(this.eleventyConfig);
		this.watchTargets.add(this.config.additionalWatchTargets);
	}

	/**
	 * Starts Eleventy.
	 */
	async init(options = {}) {
		await super.init(options);

		// eleventyServe is always available, even when not in --serve mode
		// TODO directorynorm
		this.eleventyServe.setOutputDir(this.outputDir);

		// TODO
		// this.eleventyServe.setWatcherOptions(this.getChokidarConfig());

		if (checkPassthroughCopyBehavior(this.config, this.runMode)) {
			this.eleventyServe.watchPassthroughCopy(
				this.eleventyFiles.getGlobWatcherFilesForPassthroughCopy(),
			);
		}
	}

	/**
	 * @param {string} changedFilePath - File that triggered a re-run (added or modified)
	 * @param {boolean} [isResetConfig] - are we doing a config reset
	 */
	async #addFileToWatchQueue(changedFilePath, isResetConfig) {
		// Currently this is only for 11ty.js deps but should be extended with usesGraph
		let usedByDependants = [];
		if (this.watchTargets) {
			usedByDependants = this.watchTargets.getDependantsOf(
				TemplatePath.addLeadingDotSlash(changedFilePath),
			);
		}

		let relevantLayouts = this.eleventyConfig.usesGraph.getLayoutsUsedBy(changedFilePath);

		// `eleventy.templateModified` is no longer used internally, remove in a future major version.
		eventBus.emit("eleventy.templateModified", changedFilePath, {
			usedByDependants,
			relevantLayouts,
		});

		// These listeners are *global*, not cleared even on config reset
		eventBus.emit("eleventy.resourceModified", changedFilePath, usedByDependants, {
			viaConfigReset: isResetConfig,
			relevantLayouts,
		});

		this.config.events.emit("eleventy#templateModified", changedFilePath);

		this.watchManager.addToPendingQueue(changedFilePath);
	}

	shouldTriggerConfigReset(changedFiles) {
		let configFilePaths = new Set(this.eleventyConfig.getLocalProjectConfigFiles());

		// https://www.11ty.dev/docs/watch-serve/#reset-configuration
		let resetConfigGlobs = WatchTargets.normalizeToGlobs(
			Array.from(this.eleventyConfig.userConfig.watchTargetsConfigReset),
		);

		for (let filePath of changedFiles) {
			if (configFilePaths.has(filePath)) {
				return true;
			}
			if (isGlobMatch(filePath, resetConfigGlobs)) {
				return true;
			}
		}

		for (const configFilePath of configFilePaths) {
			// Any dependencies of the config file changed
			let configFileDependencies = new Set(this.watchTargets.getDependenciesOf(configFilePath));

			for (let filePath of changedFiles) {
				if (configFileDependencies.has(filePath)) {
					return true;
				}
			}
		}

		return false;
	}

	// Checks the build queue to see if any configuration related files have changed
	#shouldResetConfig(activeQueue = []) {
		if (!activeQueue.length) {
			return false;
		}

		return this.shouldTriggerConfigReset(
			activeQueue.map((path) => {
				return PathNormalizer.normalizeSeperator(TemplatePath.addLeadingDotSlash(path));
			}),
		);
	}

	async #rewatch(isResetConfig = false) {
		if (this.watchManager.isBuildRunning()) {
			return;
		}

		this.watchManager.setBuildRunning();

		let queue = this.watchManager.getActiveQueue();

		await this.config.events.emit("beforeWatch", queue);
		await this.config.events.emit("eleventy.beforeWatch", queue);

		// Clear `import` cache for all files that triggered the rebuild (sync event)
		this.watchTargets.clearImportCacheFor(queue);

		// reset and reload global configuration
		if (isResetConfig) {
			// important: run this before config resets otherwise the handlers will disappear.
			await this.config.events.emit("eleventy.reset");
			this.resetConfig();
		}

		await this.restart();
		await this.init({ viaConfigReset: isResetConfig });

		try {
			let [passthroughCopyResults, templateResults] = await this.write();

			if (isResetConfig) {
				// make sure this happens after write()
				await this.setupWatcher();
			}

			this.watchTargets.reset();

			await this.#initWatchDependencies();

			// Add new deps to chokidar
			let newWatchTargets = this.watchTargets.getNewTargetsSinceLastReset();
			this.watcher.add(newWatchTargets);

			// Is a CSS input file and is not in the includes folder
			// TODO check output path file extension of this template (not input path)
			// TODO add additional API for this, maybe a config callback?
			let onlyCssChanges = this.watchManager.hasAllQueueFiles((path) => {
				return (
					path.endsWith(".css") &&
					// TODO how to make this work with relative includes?
					!TemplatePath.startsWithSubPath(path, this.eleventyFiles.getIncludesDir())
				);
			});

			let files = this.watchManager.getActiveQueue();

			// Maps passthrough copy files to output URLs for CSS live reload
			let stylesheetUrls = new Set();
			for (let entry of passthroughCopyResults) {
				for (let filepath in entry.map) {
					if (
						filepath.endsWith(".css") &&
						files.includes(TemplatePath.addLeadingDotSlash(filepath))
					) {
						stylesheetUrls.add(
							"/" + TemplatePath.stripLeadingSubPath(entry.map[filepath], this.outputDir),
						);
					}
				}
			}

			let normalizedPathPrefix = PathPrefixer.normalizePathPrefix(this.config.pathPrefix);
			let matchingTemplates = templateResults
				.flat()
				.filter((entry) => Boolean(entry))
				.map((entry) => {
					// only `url`, `inputPath`, and `content` are used: https://github.com/11ty/eleventy-dev-server/blob/1c658605f75224fdc76f68aebe7a412eeb4f1bc9/client/reload-client.js#L140
					entry.url = PathPrefixer.joinUrlParts(normalizedPathPrefix, entry.url);
					delete entry.rawInput; // Issue #3481
					return entry;
				});

			await this.eleventyServe.reload({
				files,
				subtype: onlyCssChanges ? "css" : undefined,
				build: {
					stylesheets: Array.from(stylesheetUrls),
					templates: matchingTemplates,
				},
			});
		} catch (error) {
			this.eleventyServe.sendError({
				error,
			});
		}

		this.watchManager.setBuildFinished();

		let queueSize = this.watchManager.getPendingQueueSize();
		if (queueSize > 0) {
			this.logger.log(
				`You saved while Eleventy was running, let’s run again. (${queueSize} change${
					queueSize !== 1 ? "s" : ""
				})`,
			);
			await this.#rewatch();
		}
	}

	/**
	 * @returns {module:11ty/eleventy/src/Benchmark/BenchmarkGroup~BenchmarkGroup}
	 */
	get watcherBench() {
		return this.bench.get("Watcher");
	}

	/**
	 * Set up watchers and benchmarks.
	 *
	 * @async
	 * @method
	 */
	async initWatch() {
		if (this.projectPackageJsonPath) {
			this.watchTargets.add([relative(TemplatePath.getWorkingDir(), this.projectPackageJsonPath)]);
		}
		this.watchTargets.add(this.eleventyFiles.getGlobWatcherFiles());
		this.watchTargets.add(this.eleventyFiles.getIgnoreFiles());

		// Watch the local project config file
		this.watchTargets.add(this.eleventyConfig.getLocalProjectConfigFiles());

		// Template and Directory Data Files
		this.watchTargets.add(await this.eleventyFiles.getGlobWatcherTemplateDataFiles());

		let benchmark = this.watcherBench.get(
			"Watching JavaScript Dependencies (disable with `eleventyConfig.setWatchJavaScriptDependencies(false)`)",
		);
		benchmark.before();
		await this.#initWatchDependencies();
		benchmark.after();
	}

	get chokidar() {
		if (!this.#chokidar) {
			// We use a string module name and try/catch here to hide this from the zisi and esbuild serverless bundlers
			// eslint-disable-next-line no-useless-catch
			try {
				let moduleName = "chokidar";
				this.#chokidar = import(moduleName).then((mod) => mod.default);
			} catch (e) {
				throw e;
			}
		}
		return this.#chokidar;
	}

	async setupWatcher() {
		await this.initWatch();

		let promises = [];
		promises.push(this.chokidar);

		if (this.watcher) {
			// Close previous watcher
			promises.push(this.watcher.close());
		}

		// TODO improve unwatching if JS dependencies are removed (or files are deleted)
		let { targets, cwd, ignores } = await this.getWatchedTargets();
		debug("Watching for changes to: %o", targets);

		let options = this.getChokidarConfig();

		if (cwd) {
			options.cwd = cwd;
		}

		debug("Ignoring watcher changes to: %o", ignores);

		options.alwaysStat = true;
		options.ignored = (path, stats) => {
			if (stats?.isFile()) {
				let isMatch = this.watchTargets.isWatchMatch(path, ignores);
				if (!isMatch) {
					return true;
				}
			}
		};

		let [chokidar] = await Promise.all(promises);
		this.watcher = chokidar.watch(targets, options);

		let watchDelay;
		let watchRun = async (path) => {
			path = TemplatePath.normalize(path);
			try {
				let isResetConfig = this.#shouldResetConfig([path]);
				this.#addFileToWatchQueue(path, isResetConfig);

				clearTimeout(watchDelay);

				let { promise, resolve, reject } = withResolvers();

				watchDelay = setTimeout(async () => {
					this.#rewatch(isResetConfig).then(resolve, reject);
				}, this.config.watchThrottleWaitTime);

				await promise;
			} catch (e) {
				if (e instanceof EleventyBaseError) {
					this.errorHandler.error(e, "Eleventy watch error");
					this.watchManager.setBuildFinished();
				} else {
					this.errorHandler.fatal(e, "Eleventy fatal watch error");
					await this.close();
				}
			}

			this.config.events.emit("eleventy.afterwatch");
		};

		this.watcher.on("change", async (path) => {
			// Emulated passthrough copy logs from the server
			if (!this.eleventyServe.isEmulatedPassthroughCopyMatch(path)) {
				this.logger.forceLog(
					`File changed: ${TemplatePath.stripLeadingDotSlash(TemplatePath.standardizeFilePath(path))}`,
				);
			}

			await watchRun(path);
		});

		this.watcher.on("add", async (path) => {
			// Emulated passthrough copy logs from the server
			if (!this.eleventyServe.isEmulatedPassthroughCopyMatch(path)) {
				this.logger.forceLog(
					`File added: ${TemplatePath.stripLeadingDotSlash(TemplatePath.standardizeFilePath(path))}`,
				);
			}

			this.fileSystemSearch.add(path);
			await watchRun(path);
		});

		this.watcher.on("unlink", async (path) => {
			// Emulated passthrough copy logs from the server
			if (!this.eleventyServe.isEmulatedPassthroughCopyMatch(path)) {
				this.logger.forceLog(
					`File deleted: ${TemplatePath.stripLeadingDotSlash(TemplatePath.standardizeFilePath(path))}`,
				);
			}
			this.fileSystemSearch.delete(path);
			await watchRun(path);
		});

		let { promise, resolve, reject } = withResolvers();
		// wait for chokidar to be ready.
		this.watcher.on("ready", () => {
			this.logger.forceLog("Watching…");
			resolve();
		});
		await promise;

		// For testability
		return watchRun;
	}

	/**
	 * Starts watching dependencies.
	 */
	async #initWatchDependencies() {
		if (!this.eleventyConfig.shouldSpiderJavaScriptDependencies()) {
			return;
		}

		// TODO use DirContains
		let dataDir = TemplatePath.stripLeadingDotSlash(this.templateData.getDataDir());
		function filterOutGlobalDataFiles(path) {
			return !dataDir || !TemplatePath.stripLeadingDotSlash(path).startsWith(dataDir);
		}

		// Lazy resolve isEsm only for --watch
		this.watchTargets.setProjectUsingEsm(this.isEsm);

		// Template files .11ty.js
		let templateFiles = await this.eleventyFiles.getWatchPathCache();
		await this.watchTargets.addDependencies(templateFiles);

		// Config file dependencies
		await this.watchTargets.addDependencies(
			this.eleventyConfig.getLocalProjectConfigFiles(),
			filterOutGlobalDataFiles,
		);

		// Deps from Global Data (that aren’t in the global data directory, everything is watched there)
		let globalDataDeps = this.templateData.getWatchPathCache();
		await this.watchTargets.addDependencies(globalDataDeps, filterOutGlobalDataFiles);

		await this.watchTargets.addDependencies(
			await this.eleventyFiles.getWatcherTemplateJavaScriptDataFiles(),
		);
	}

	getWatchedFiles() {
		throw new Error(
			"Eleventy#getWatchedFiles() has been removed in Eleventy v4. Use Eleventy#getWatchedTargets().targets instead.",
		);
	}

	/**
	 * Returns all watched paths
	 *
	 * @async
	 * @method
	 * @returns {Object} containing `cwd` string, `targets` file paths, and `ignores` globs Array
	 */
	async getWatchedTargets() {
		let rawWatchedGlobs = await this.watchTargets.getTargets();
		let ignores = this.eleventyFiles.getGlobWatcherIgnores();

		// Remap all paths to `cwd` if in play (Issue #3854)
		// This is likely unnecessary since #3854 was for tinyglobby it’s probably better to have a cwd
		// anyway to have nice paths passed into chokidar events
		let remapper = new GlobRemap(rawWatchedGlobs);
		let cwd = remapper.getCwd();

		if (cwd) {
			rawWatchedGlobs = remapper.getInput().map((entry) => {
				return TemplatePath.stripLeadingDotSlash(entry);
			});
			ignores = remapper.getRemapped(ignores || []);
		}

		ignores = ignores.map((entry) => {
			return TemplatePath.stripLeadingDotSlash(entry);
		});

		debug("Ignoring watcher changes to: %o", ignores);

		return {
			cwd,
			targets: rawWatchedGlobs,
			ignores,
		};
	}

	getChokidarConfig() {
		let configOptions = this.config.chokidarConfig;

		// unsupported: using your own `ignored`
		delete configOptions.ignored;

		return Object.assign(
			{
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 150,
					pollInterval: 25,
				},
			},
			configOptions,
		);
	}

	/**
	 * Start watching files
	 *
	 * @async
	 * @method
	 */
	async watch() {
		this.watcherBench.setMinimumThresholdMs(500);
		this.watcherBench.reset();

		// Note that watching indirectly depends on this for fetching dependencies from JS files
		// See: TemplateWriter:pathCache and WatchTargets
		await this.write();

		let initWatchBench = this.watcherBench.get("Start up --watch");
		initWatchBench.before();

		let watchRun = await this.setupWatcher();

		initWatchBench.after();

		this.watcherBench.finish("Watch");

		// Returns for testability
		return watchRun;
	}

	// Renamed to close()
	async stopWatch() {
		return this.close();
	}

	async close() {
		// Prevent multiple invocations.
		if (this.#isStopping) {
			return this.#isStopping;
		}

		debug("Cleaning up chokidar and server instances, if they exist.");
		this.#isStopping = Promise.all([this.eleventyServe.close(), this.watcher?.close()]).then(() => {
			this.#isStopping = false;
		});

		return this.#isStopping;
	}

	/**
	 * Serve Eleventy on this port.
	 *
	 * @param {Number} port - The HTTP port to serve Eleventy from.
	 */
	async serve(port) {
		// Port is optional and in this case likely via --port on the command line
		// May defer to configuration API options `port` property
		return this.eleventyServe.serve(port);
	}

	/**
	 * Shows a help message including usage.
	 *
	 * @static
	 * @returns {string} - The help message.
	 */
	static getHelp() {
		return `Usage: eleventy
       eleventy --input=. --output=./_site
       eleventy --serve

Arguments:

     --version

     --input=.
       Input template files (default: \`.\`)

     --output=_site
       Write HTML output to this folder (default: \`_site\`)

     --serve
       Run web server on --port (default 8080) and watch them too

     --port
       Run the --serve web server on this port (default 8080)

     --watch
       Wait for files to change and automatically rewrite (no web server)

     --incremental
       Only build the files that have changed. Best with watch/serve.

     --incremental=filename.md
       Does not require watch/serve. Run an incremental build targeting a single file.

     --ignore-initial
       Start without a build; build when files change. Works best with watch/serve/incremental.

     --formats=liquid,md
       Allow only certain template types (default: \`*\`)

     --quiet
       Don’t print all written files (off by default)

     --config=filename.js
       Override the eleventy config file path (default: \`.eleventy.js\`)

     --pathprefix='/'
       Change all url template filters to use this subdirectory.

     --dryrun
       Don’t write any files. Useful in DEBUG mode, for example: \`DEBUG=Eleventy* npx @11ty/eleventy --dryrun\`

     --loader
       Set to "esm" to force ESM mode, "cjs" to force CommonJS mode, or "auto" (default) to infer it from package.json.

     --to=json
       Change the output to JSON (default: \`fs\`)

     --to=fs:templates
       Writes templates, skips passthrough copy

     --help`;
	}

	/**
	 * @deprecated since 1.0.1, use static Eleventy.getHelp()
	 */
	getHelp() {
		return Eleventy.getHelp();
	}
}

export { Eleventy };

/* Utils */
export { EleventyImport as ImportFile } from "./Util/Require.js";

// TODO(breaking) remove these and recommend folks use package level exports e.g. "@11ty/eleventy/plugins/i18n"

/* Plugins */
export { default as BundlePlugin } from "@11ty/eleventy-plugin-bundle";

// Eleventy*Plugin names are legacy names
export {
	default as RenderPlugin,
	default as EleventyRenderPlugin,
} from "./Plugins/RenderPlugin.js";
export { default as I18nPlugin, default as EleventyI18nPlugin } from "./Plugins/I18nPlugin.js";
export {
	default as HtmlBasePlugin,
	default as EleventyHtmlBasePlugin,
} from "./Plugins/HtmlBasePlugin.js";
export { TransformPlugin as InputPathToUrlTransformPlugin } from "./Plugins/InputPathToUrl.js";
export { IdAttributePlugin } from "./Plugins/IdAttributePlugin.js";

// Error messages for Removed plugins
export function EleventyServerlessBundlerPlugin() {
	throw new Error(
		"Following feedback from our Community Survey, low interest in this plugin prompted its removal from Eleventy core in 3.0 as we refocus on static sites. Learn more: https://v3.11ty.dev/docs/plugins/serverless/",
	);
}

export { EleventyServerlessBundlerPlugin as EleventyServerless };

export function EleventyEdgePlugin() {
	throw new Error(
		"Following feedback from our Community Survey, low interest in this plugin prompted its removal from Eleventy core in 3.0 as we refocus on static sites. Learn more: https://v3.11ty.dev/docs/plugins/edge/",
	);
}
