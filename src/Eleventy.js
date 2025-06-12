/* Core */
import chalk from "kleur";
import { filesize } from "filesize";
import debugUtil from "debug";

import { TemplatePath } from "@11ty/eleventy-utils";

import { Core } from "./Core.js";
import EleventyServe from "./EleventyServe.js";
import FileSystemSearch from "./FileSystemSearch.js";
import EleventyWatch from "./EleventyWatch.js";
import EleventyWatchTargets from "./EleventyWatchTargets.js";
import EleventyFiles from "./EleventyFiles.js";
import TemplatePassthroughManager from "./TemplatePassthroughManager.js";
import EleventyBaseError from "./Errors/EleventyBaseError.js";

// Utils
import simplePlural from "./Util/Pluralize.js";
import { getEleventyPackageJson } from "./Util/ImportJsonSync.js";
import checkPassthroughCopyBehavior from "./Util/PassthroughCopyBehaviorCheck.js";
import PathPrefixer from "./Util/PathPrefixer.js";
import PathNormalizer from "./Util/PathNormalizer.js";
import { isGlobMatch } from "./Adapters/Util/GlobMatcher.js";
import eventBus from "./EventBus.js";
import { withResolvers } from "./Util/PromiseUtil.js";

const pkg = getEleventyPackageJson();
const debug = debugUtil("Eleventy");

export default class Eleventy extends Core {
	/** @type {boolean} */
	#isStopping = false;

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

		if (this.watchManager) {
			this.watchManager.incremental = !!isIncremental;
		}
	}

	async initializeConfig(initOverrides) {
		await super.initializeConfig(initOverrides);

		/** @type {object} */
		this.eleventyServe = new EleventyServe();
		this.eleventyServe.eleventyConfig = this.eleventyConfig;

		/** @type {object} */
		this.watchManager = new EleventyWatch();

		/** @type {object} */
		this.watchTargets = new EleventyWatchTargets(this.eleventyConfig);
		this.watchTargets.addAndMakeGlob(this.config.additionalWatchTargets);

		/** @type {object} */
		this.fileSystemSearch = new FileSystemSearch();
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

		this.templateData.setFileSystemSearch(this.fileSystemSearch);

		this.passthroughManager = new TemplatePassthroughManager(this.eleventyConfig);
		this.passthroughManager.setRunMode(this.runMode);
		this.passthroughManager.setDryRun(this.isDryRun);
		this.passthroughManager.extensionMap = this.extensionMap;
		this.passthroughManager.setFileSystemSearch(this.fileSystemSearch);

		let formats = this.templateFormats.getTemplateFormats();
		this.eleventyFiles = new EleventyFiles(formats, this.eleventyConfig);
		this.eleventyFiles.setPassthroughManager(this.passthroughManager);
		this.eleventyFiles.setFileSystemSearch(this.fileSystemSearch);
		this.eleventyFiles.setRunMode(this.runMode);
		this.eleventyFiles.extensionMap = this.extensionMap;
		// This needs to be set before init or it’ll construct a new one
		this.eleventyFiles.templateData = this.templateData;
		this.eleventyFiles.init();

		if (checkPassthroughCopyBehavior(this.config, this.runMode)) {
			this.eleventyServe.watchPassthroughCopy(
				this.eleventyFiles.getGlobWatcherFilesForPassthroughCopy(),
			);
		}

		this.writer.setPassthroughManager(this.passthroughManager);
		this.writer.setEleventyFiles(this.eleventyFiles);
	}

	/**
	 * Restarts Eleventy.
	 */
	async restart() {
		await super.restart();

		// TODO
		this.passthroughManager.reset();
		// TODO
		this.eleventyFiles.restart();
	}

	/**
	 * Resets the config of Eleventy.
	 *
	 * @method
	 */
	async resetConfig() {
		await super.resetConfig();

		this.eleventyServe.eleventyConfig = this.eleventyConfig;
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
		let resetConfigGlobs = EleventyWatchTargets.normalizeToGlobs(
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

	async #watch(isResetConfig = false) {
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

			await this.resetConfig();
		}

		await this.restart();
		await this.init({ viaConfigReset: isResetConfig });

		try {
			let [passthroughCopyResults, templateResults] = await this.write();

			this.watchTargets.reset();

			await this.#initWatchDependencies();

			// Add new deps to chokidar
			this.watcher.add(this.watchTargets.getNewTargetsSinceLastReset());

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
			await this.#watch();
		} else {
			this.logger.log("Watching…");
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
		this.watchManager = new EleventyWatch();
		this.watchManager.incremental = this.isIncremental;

		this.watchTargets.add(["./package.json"]);
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

	/**
	 * Starts watching dependencies.
	 */
	async #initWatchDependencies() {
		if (!this.eleventyConfig.shouldSpiderJavaScriptDependencies()) {
			return;
		}

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

	/**
	 * Returns all watched files.
	 *
	 * @async
	 * @method
	 * @returns {Promise<Array>} targets - The watched files.
	 */
	async getWatchedFiles() {
		return this.watchTargets.getTargets();
	}

	getChokidarConfig() {
		let ignores = this.eleventyFiles.getGlobWatcherIgnores();
		debug("Ignoring watcher changes to: %o", ignores);

		let configOptions = this.config.chokidarConfig;

		// can’t override these yet
		// TODO maybe if array, merge the array?
		delete configOptions.ignored;

		return Object.assign(
			{
				ignored: ignores,
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
	 * Start the watching of files
	 *
	 * @async
	 * @method
	 */
	async watch() {
		this.watcherBench.setMinimumThresholdMs(500);
		this.watcherBench.reset();

		// We use a string module name and try/catch here to hide this from the zisi and esbuild serverless bundlers
		let chokidar;
		// eslint-disable-next-line no-useless-catch
		try {
			let moduleName = "chokidar";
			let chokidarImport = await import(moduleName);
			chokidar = chokidarImport.default;
		} catch (e) {
			throw e;
		}

		// Note that watching indirectly depends on this for fetching dependencies from JS files
		// See: TemplateWriter:pathCache and EleventyWatchTargets
		await this.write();

		let initWatchBench = this.watcherBench.get("Start up --watch");
		initWatchBench.before();

		await this.initWatch();

		// TODO improve unwatching if JS dependencies are removed (or files are deleted)
		let rawFiles = await this.getWatchedFiles();
		debug("Watching for changes to: %o", rawFiles);

		let watcher = chokidar.watch(rawFiles, this.getChokidarConfig());

		initWatchBench.after();

		this.watcherBench.finish("Watch");

		this.logger.forceLog("Watching…");

		this.watcher = watcher;

		let watchDelay;
		let watchRun = async (path) => {
			path = TemplatePath.normalize(path);
			try {
				let isResetConfig = this.#shouldResetConfig([path]);
				this.#addFileToWatchQueue(path, isResetConfig);

				clearTimeout(watchDelay);

				let { promise, resolve, reject } = withResolvers();

				watchDelay = setTimeout(async () => {
					this.#watch(isResetConfig).then(resolve, reject);
				}, this.config.watchThrottleWaitTime);

				await promise;
			} catch (e) {
				if (e instanceof EleventyBaseError) {
					this.errorHandler.error(e, "Eleventy watch error");
					this.watchManager.setBuildFinished();
				} else {
					this.errorHandler.fatal(e, "Eleventy fatal watch error");
					await this.stopWatch();
				}
			}

			this.config.events.emit("eleventy.afterwatch");
		};

		watcher.on("change", async (path) => {
			// Emulated passthrough copy logs from the server
			if (!this.eleventyServe.isEmulatedPassthroughCopyMatch(path)) {
				this.logger.forceLog(`File changed: ${TemplatePath.standardizeFilePath(path)}`);
			}

			await watchRun(path);
		});

		watcher.on("add", async (path) => {
			// Emulated passthrough copy logs from the server
			if (!this.eleventyServe.isEmulatedPassthroughCopyMatch(path)) {
				this.logger.forceLog(`File added: ${TemplatePath.standardizeFilePath(path)}`);
			}

			this.fileSystemSearch.add(path);
			await watchRun(path);
		});

		watcher.on("unlink", (path) => {
			this.logger.forceLog(`File deleted: ${TemplatePath.standardizeFilePath(path)}`);
			this.fileSystemSearch.delete(path);
		});

		// wait for chokidar to be ready.
		await new Promise((resolve) => {
			watcher.on("ready", () => resolve());
		});
	}

	async stopWatch() {
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
     --to=ndjson
       Change the output to JSON or NDJSON (default: \`fs\`)

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
			debug("Total passthrough copy aggregate size: %o", filesize(copySize));
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
			ret.push(`(v${pkg.version})`);
		}

		return ret.join(" ");
	}
}

export { Eleventy };

/* Utils */
export { EleventyImport as ImportFile } from "./Util/Require.js";

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
