const pkg = require("../package.json");
const TemplatePath = require("./TemplatePath");
const TemplateData = require("./TemplateData");
const TemplateWriter = require("./TemplateWriter");
const EleventyExtensionMap = require("./EleventyExtensionMap");
const EleventyErrorHandler = require("./EleventyErrorHandler");
const EleventyBaseError = require("./EleventyBaseError");
const EleventyServe = require("./EleventyServe");
const EleventyWatch = require("./EleventyWatch");
const EleventyWatchTargets = require("./EleventyWatchTargets");
const EleventyFiles = require("./EleventyFiles");
const ConsoleLogger = require("./Util/ConsoleLogger");
const TemplateConfig = require("./TemplateConfig");
const { performance } = require("perf_hooks");

const templateCache = require("./TemplateCache");
const simplePlural = require("./Util/Pluralize");
const deleteRequireCache = require("./Util/DeleteRequireCache");
const bench = require("./BenchmarkManager");
const debug = require("debug")("Eleventy");
const eventBus = require("./EventBus");

/**
 * @module 11ty/eleventy/Eleventy
 */

/**
 * Runtime of eleventy.
 *
 * @param {String} input - Where to read files from.
 * @param {String} output - Where to write rendered files to.
 * @returns {module:11ty/eleventy/Eleventy~Eleventy}
 */
class Eleventy {
  constructor(input, output, options = {}, eleventyConfig = null) {
    if (!eleventyConfig) {
      this.eleventyConfig = new TemplateConfig(null, options.configPath);
    } else {
      this.eleventyConfig = eleventyConfig;
      if (options.configPath) {
        this.eleventyConfig.setProjectConfigPath(options.configPath);
      }
    }

    this.eleventyConfig.setLogger(this.logger);

    if (options.config && typeof options.config === "function") {
      // TODO use return object here?
      options.config(this.eleventyConfig.userConfig);
    }

    /**
     * @member {String} - The path to Eleventy's config file.
     * @default null
     */
    this.configPath = options.configPath;

    /**
     * @member {String} - Called via CLI (`cli`) or Programmatically (`script`)
     * @default "script"
     */
    this.source = options.source || "script";

    /**
     * @member {Object} - Initialize Eleventy environment variables
     * @default null
     */
    this.env = this.getEnvironmentVariableValues();
    this.initializeEnvironmentVariables(this.env);

    /**
     * @member {Object} - Initialize Eleventy’s configuration, including the user config file
     */
    this.config = this.eleventyConfig.getConfig();

    /**
     * @member {Boolean} - Was verbose mode overwritten?
     * @default false
     */
    this.verboseModeSetViaCommandLineParam = false;

    /**
     * @member {Boolean} - Is Eleventy running in verbose mode?
     * @default true
     */
    if (options.quietMode === true || options.quietMode === false) {
      // Set via --quiet
      this.setIsVerbose(!options.quietMode);
      this.verboseModeSetViaCommandLineParam = true;
    } else {
      // Fall back to configuration
      this.setIsVerbose(!this.config.quietMode);
    }

    /**
     * @member {Boolean} - Is Eleventy running in dry mode?
     * @default false
     */
    this.isDryRun = false;

    /**
     * @member {Boolean} - Does the init() method still need to be run (or hasn’t finished yet)
     * @default true
     */
    this.needsInit = true;

    /**
     * @member {Boolean} - Explicit input directory (usually used when input is a single file/serverless)
     */
    if (options.inputDir) {
      this.setInputDir(options.inputDir);
    }

    if (performance) {
      // TODO this doesn’t reset in serverless mode correctly (cumulative from start of --serve/watch)
      debug("Eleventy warm up time (in ms) %o", performance.now());
    }

    /** @member {Number} - The timestamp of Eleventy start. */
    this.start = this.getNewTimestamp();

    /**
     * @member {Array<String>} - Subset of template types.
     * @default null
     */
    this.formatsOverride = null;

    /** @member {Object} - tbd. */
    this.eleventyServe = new EleventyServe();
    this.eleventyServe.config = this.config;

    /** @member {String} - Holds the path to the input directory. */
    this.rawInput = input;

    /** @member {String} - Holds the path to the output directory. */
    this.rawOutput = output;

    /** @member {Object} - tbd. */
    this.watchManager = new EleventyWatch();

    /** @member {Object} - tbd. */
    this.watchTargets = new EleventyWatchTargets();
    this.watchTargets.addAndMakeGlob(this.config.additionalWatchTargets);
    this.watchTargets.watchJavaScriptDependencies =
      this.config.watchJavaScriptDependencies;
  }

  getNewTimestamp() {
    if (performance) {
      return performance.now();
    }
    return new Date().getTime();
  }

  /** @type {String} */
  get input() {
    return this.rawInput || this.config.dir.input;
  }

  /** @type {String} */
  get inputDir() {
    if (this._inputDir) {
      // set manually via setter
      return this._inputDir;
    }

    return TemplatePath.getDir(this.input);
  }

  setInputDir(dir) {
    this._inputDir = dir;
  }

  /** @type {String} */
  get outputDir() {
    let dir = this.rawOutput || this.config.dir.output;
    if (dir !== this._savedOutputDir) {
      this.eleventyServe.setOutputDir(dir);
    }
    this._savedOutputDir = dir;

    return dir;
  }

  /**
   * Updates the dry-run mode of Eleventy.
   *
   * @method
   * @param {Boolean} isDryRun - Shall Eleventy run in dry mode?
   */
  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;
  }

  /**
   * Sets the incremental build mode.
   *
   * @method
   * @param {Boolean} isIncremental - Shall Eleventy run in incremental build mode and only write the files that trigger watch updates
   */
  setIncrementalBuild(isIncremental) {
    this.isIncremental = !!isIncremental;
    this.watchManager.incremental = !!isIncremental;
  }

  /**
   * Updates the passthrough mode of Eleventy.
   *
   * @method
   * @param {Boolean} isPassthroughAll - Shall Eleventy passthrough everything?
   */
  setPassthroughAll(isPassthroughAll) {
    this.isPassthroughAll = !!isPassthroughAll;
  }

  /**
   * Updates the path prefix used in the config.
   *
   * @method
   * @param {String} pathPrefix - The new path prefix.
   */
  setPathPrefix(pathPrefix) {
    if (pathPrefix || pathPrefix === "") {
      this.eleventyConfig.setPathPrefix(pathPrefix);
      this.config = this.eleventyConfig.getConfig();
    }
  }

  /**
   * Updates the watch targets.
   *
   * @method
   * @param {} watchTargets - The new watch targets.
   */
  setWatchTargets(watchTargets) {
    this.watchTargets = watchTargets;
  }

  /**
   * Restarts Eleventy.
   *
   * @async
   * @method
   */
  async restart() {
    debug("Restarting");
    this.start = this.getNewTimestamp();
    templateCache.clear();
    bench.reset();
    this.eleventyFiles.restart();
    this.extensionMap.reset();

    // reload package.json values (if applicable)
    // TODO only reset this if it changed
    deleteRequireCache(TemplatePath.absolutePath("package.json"));

    await this.init();
  }

  /**
   * Logs some statistics after a complete run of Eleventy.
   *
   * @method
   * @returns {String} ret - The log message.
   */
  logFinished() {
    if (!this.writer) {
      throw new Error(
        "Did you call Eleventy.init to create the TemplateWriter instance? Hint: you probably didn’t."
      );
    }

    let ret = [];

    let writeCount = this.writer.getWriteCount();
    let skippedCount = this.writer.getSkippedCount();
    let copyCount = this.writer.getCopyCount();

    let slashRet = [];

    if (copyCount) {
      slashRet.push(
        `Copied ${copyCount} ${simplePlural(copyCount, "file", "files")}`
      );
    }

    slashRet.push(
      `Wrote ${writeCount} ${simplePlural(writeCount, "file", "files")}${
        skippedCount ? ` (skipped ${skippedCount})` : ""
      }`
    );

    if (slashRet.length) {
      ret.push(slashRet.join(" / "));
    }

    let versionStr = `v${pkg.version}`;
    let time = ((this.getNewTimestamp() - this.start) / 1000).toFixed(2);
    ret.push(`in ${time} ${simplePlural(time, "second", "seconds")}`);

    if (writeCount >= 10) {
      ret.push(
        `(${((time * 1000) / writeCount).toFixed(1)}ms each, ${versionStr})`
      );
    } else {
      ret.push(`(${versionStr})`);
    }

    let pathPrefix = this.config.pathPrefix;
    if (pathPrefix && pathPrefix !== "/") {
      return `Using pathPrefix: ${pathPrefix}\n${ret.join(" ")}`;
    }

    return ret.join(" ");
  }

  /**
   * Starts Eleventy.
   *
   * @async
   * @method
   * @returns {} - tbd.
   */
  async init() {
    await this.config.events.emit("eleventy.config", this.eleventyConfig);

    if (this.env) {
      await this.config.events.emit("eleventy.env", this.env);
    }

    this.config.inputDir = this.inputDir;

    let formats = this.formatsOverride || this.config.templateFormats;
    this.extensionMap = new EleventyExtensionMap(formats, this.eleventyConfig);
    await this.config.events.emit("eleventy.extensionmap", this.extensionMap);

    this.eleventyFiles = new EleventyFiles(
      this.inputDir,
      this.outputDir,
      formats,
      this.eleventyConfig
    );
    this.eleventyFiles.setPassthroughAll(this.isPassthroughAll);
    this.eleventyFiles.setInput(this.inputDir, this.input);
    this.eleventyFiles.extensionMap = this.extensionMap;
    this.eleventyFiles.init();

    this.templateData = new TemplateData(this.inputDir, this.eleventyConfig);
    this.templateData.extensionMap = this.extensionMap;
    if (this.env) {
      this.templateData.environmentVariables = this.env;
    }
    this.eleventyFiles.templateData = this.templateData;

    this.writer = new TemplateWriter(
      this.inputDir,
      this.outputDir,
      formats,
      this.templateData,
      this.eleventyConfig
    );
    this.writer.setInput(this.inputDir, this.input);
    this.writer.logger = this.logger;
    this.writer.extensionMap = this.extensionMap;
    this.writer.setEleventyFiles(this.eleventyFiles);

    let dirs = {
      input: this.inputDir,
      data: this.templateData.getDataDir(),
      includes: this.eleventyFiles.getIncludesDir(),
      layouts: this.eleventyFiles.getLayoutsDir(),
      output: this.outputDir,
    };

    debug(`Directories:
Input (Dir): ${dirs.input}
Input (File): ${this.rawInput}
Data: ${dirs.data}
Includes: ${dirs.includes}
Layouts: ${dirs.layouts}
Output: ${dirs.output}
Template Formats: ${formats.join(",")}
Verbose Output: ${this.verboseMode}`);

    this.writer.setVerboseOutput(this.verboseMode);
    this.writer.setDryRun(this.isDryRun);

    this.config.events.emit("eleventy.directories", dirs);

    let data = this.templateData.cacheData();

    this.needsInit = false;

    // …why does it return this
    return data;
  }

  // These are all set as initial global data under eleventy.env.* (see TemplateData->environmentVariables)
  getEnvironmentVariableValues() {
    let configPath = this.eleventyConfig.getLocalProjectConfigFile();
    let absolutePathToConfig = TemplatePath.absolutePath(configPath);
    // TODO(zachleat): if config is not in root (e.g. using --config=)
    let root = TemplatePath.getDirFromFilePath(absolutePathToConfig);

    return {
      config: absolutePathToConfig,
      root,
      source: this.source,
    };
  }

  /**
   * Set process.ENV variables for use in Eleventy projects
   *
   * @method
   */
  initializeEnvironmentVariables(env) {
    process.env.ELEVENTY_ROOT = env.root;
    debug("Setting process.env.ELEVENTY_ROOT: %o", env.root);

    process.env.ELEVENTY_SOURCE = this.source;

    // TODO (@zachleat) this needs to be extensible. https://github.com/11ty/eleventy/issues/1957
    // Note: when using --serve, ELEVENTY_SERVERLESS is set manually in Serverless.js

    // Careful here, setting to false will cast to string "false" which is truthy.
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.env.ELEVENTY_SERVERLESS = true;
      debug("Setting process.env.ELEVENTY_SERVERLESS: %o", true);
    }
  }

  /* Setter for verbose mode */
  set verboseMode(value) {
    this._isVerboseMode = !!value;

    if (this.writer) {
      this.writer.setVerboseOutput(this._isVerboseMode);
    }

    if (bench) {
      bench.setVerboseOutput(this._isVerboseMode);
    }

    if (this.logger) {
      this.logger.isVerbose = this._isVerboseMode;
    }

    if (this.errorHandler) {
      this.errorHandler.isVerbose = this._isVerboseMode;
    }
  }

  /* Getter for verbose mode */
  get verboseMode() {
    return this._isVerboseMode;
  }

  /* Getter for Logger */
  get logger() {
    if (!this._logger) {
      this._logger = new ConsoleLogger();
      this._logger.isVerbose = this.verboseMode;
    }

    return this._logger;
  }

  /* Setter for Logger */
  set logger(logger) {
    this.eleventyConfig.setLogger(logger);
    this._logger = logger;
  }

  disableLogger() {
    this._logger.overrideLogger(false);
  }

  /* Getter for error handler */
  get errorHandler() {
    if (!this._errorHandler) {
      this._errorHandler = new EleventyErrorHandler();
      this._errorHandler.isVerbose = this.verboseMode;
      this._errorHandler.logger = this.logger;
    }

    return this._errorHandler;
  }

  /**
   * Updates the verbose mode of Eleventy.
   *
   * @method
   * @param {Boolean} isVerbose - Shall Eleventy run in verbose mode?
   */
  setIsVerbose(isVerbose) {
    // Debug mode should always run quiet (all output goes to debug logger)
    if (process.env.DEBUG) {
      isVerbose = false;
    }
    if (this.logger) {
      this.logger.isVerbose = isVerbose;
    }

    bench.setVerboseOutput(isVerbose);
    this.verboseMode = isVerbose;

    // Set verbose mode in config file
    this.eleventyConfig.verbose = this.verboseMode;
  }

  /**
   * Updates the template formats of Eleventy.
   *
   * @method
   * @param {String} formats - The new template formats.
   */
  setFormats(formats) {
    if (formats && formats !== "*") {
      this.formatsOverride = formats.split(",");
    }
  }

  /**
   * Reads the version of Eleventy.
   *
   * @method
   * @returns {String} - The version of Eleventy.
   */
  getVersion() {
    return pkg.version;
  }

  /**
   * Shows a help message including usage.
   *
   * @method
   * @returns {String} - The help mesage.
   */
  getHelp() {
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

     --formats=liquid,md
       Whitelist only certain template types (default: \`*\`)

     --quiet
       Don’t print all written files (off by default)

     --config=filename.js
       Override the eleventy config file path (default: \`.eleventy.js\`)

     --pathprefix='/'
       Change all url template filters to use this subdirectory.

     --dryrun
       Don’t write any files. Useful with \`DEBUG=Eleventy* npx eleventy\`

     --to=json
     --to=ndjson
       Change the output to JSON or NDJSON (default: \`fs\`)

     --help`;
  }

  /**
   * Resets the config of Eleventy.
   *
   * @method
   */
  resetConfig() {
    this.env = this.getEnvironmentVariableValues();
    this.initializeEnvironmentVariables(this.env);

    this.eleventyConfig.reset();

    this.config = this.eleventyConfig.getConfig();
    this.eleventyServe.config = this.config;

    // only use config quietMode if --quiet not set on CLI
    if (!this.verboseModeSetViaCommandLineParam) {
      this.setIsVerbose(!this.config.quietMode);
    }
  }

  /**
   * tbd.
   *
   * @private
   * @method
   * @param {String} changedFilePath - File that triggered a re-run (added or modified)
   */
  async _addFileToWatchQueue(changedFilePath) {
    eventBus.emit("eleventy.resourceModified", changedFilePath);
    this.watchManager.addToPendingQueue(changedFilePath);
  }

  /**
   * tbd.
   *
   * @private
   * @method
   */
  async _watch() {
    if (this.watchManager.isBuildRunning()) {
      return;
    }

    this.watchManager.setBuildRunning();

    let queue = this.watchManager.getActiveQueue();
    await this.config.events.emit("beforeWatch", queue);
    await this.config.events.emit("eleventy.beforeWatch", queue);

    // reset and reload global configuration :O
    if (
      this.watchManager.hasQueuedFile(
        this.eleventyConfig.getLocalProjectConfigFile()
      )
    ) {
      this.resetConfig();
    }

    await this.restart();

    this.watchTargets.clearDependencyRequireCache();

    let incrementalFile = this.watchManager.getIncrementalFile();
    if (incrementalFile) {
      this.writer.setIncrementalFile(incrementalFile);
    }

    await this.write();
    // let writeResult = await this.write();
    // let hasError = !!writeResult.error;

    this.writer.resetIncrementalFile();

    this.watchTargets.reset();

    await this._initWatchDependencies();

    // Add new deps to chokidar
    this.watcher.add(this.watchTargets.getNewTargetsSinceLastReset());

    // Is a CSS input file and is not in the includes folder
    // TODO check output path file extension of this template (not input path)
    // TODO add additional API for this, maybe a config callback?
    let onlyCssChanges = this.watchManager.hasAllQueueFiles((path) => {
      return (
        path.endsWith(".css") &&
        // TODO how to make this work with relative includes?
        !TemplatePath.startsWithSubPath(
          path,
          this.eleventyFiles.getIncludesDir()
        )
      );
    });

    if (onlyCssChanges) {
      this.eleventyServe.reload("*.css");
    } else {
      this.eleventyServe.reload();
    }

    this.watchManager.setBuildFinished();

    if (this.watchManager.getPendingQueueSize() > 0) {
      this.logger.log(
        `You saved while Eleventy was running, let’s run again. (${this.watchManager.getPendingQueueSize()} remain)`
      );
      await this._watch();
    } else {
      this.logger.log("Watching…");
    }
  }

  /**
   * tbd.
   *
   * @returns {} - tbd.
   */
  get watcherBench() {
    return bench.get("Watcher");
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

    this.watchTargets.add(this.eleventyFiles.getGlobWatcherFiles());

    // Watch the local project config file
    this.watchTargets.add(this.eleventyConfig.getLocalProjectConfigFile());

    // Template and Directory Data Files
    this.watchTargets.add(
      await this.eleventyFiles.getGlobWatcherTemplateDataFiles()
    );

    let benchmark = this.watcherBench.get(
      "Watching JavaScript Dependencies (disable with `eleventyConfig.setWatchJavaScriptDependencies(false)`)"
    );
    benchmark.before();
    await this._initWatchDependencies();
    benchmark.after();
  }

  /**
   * Starts watching dependencies.
   *
   * @private
   * @async
   * @method
   */
  async _initWatchDependencies() {
    if (!this.watchTargets.watchJavaScriptDependencies) {
      return;
    }

    let dataDir = this.templateData.getDataDir();
    function filterOutGlobalDataFiles(path) {
      return !dataDir || path.indexOf(dataDir) === -1;
    }

    // Template files .11ty.js
    let templateFiles = this.eleventyFiles.getWatchPathCache();
    this.watchTargets.addDependencies(templateFiles);

    // Config file dependencies
    this.watchTargets.addDependencies(
      this.eleventyConfig.getLocalProjectConfigFile(),
      filterOutGlobalDataFiles
    );

    // Deps from Global Data (that aren’t in the global data directory, everything is watched there)
    this.watchTargets.addDependencies(
      this.templateData.getWatchPathCache(),
      filterOutGlobalDataFiles
    );

    this.watchTargets.addDependencies(
      await this.eleventyFiles.getWatcherTemplateJavaScriptDataFiles()
    );
  }

  /**
   * Returns all watched files.
   *
   * @async
   * @method
   * @returns {} targets - The watched files.
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
      configOptions
    );
  }

  /**
   * Start the watching of files.
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
      chokidar = require(moduleName);
    } catch (e) {
      throw e;
    }

    // Note that watching indirectly depends on this for fetching dependencies from JS files
    // See: TemplateWriter:pathCache and EleventyWatchTargets
    let result = await this.write();
    if (result.error) {
      // initial build failed—quit watch early
      return Promise.reject(result.error);
    }

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
      try {
        this._addFileToWatchQueue(path);
        clearTimeout(watchDelay);

        await new Promise((resolve, reject) => {
          watchDelay = setTimeout(async () => {
            this._watch().then(resolve, reject);
          }, this.config.watchThrottleWaitTime);
        });
      } catch (e) {
        if (e instanceof EleventyBaseError) {
          this.errorHandler.error(e, "Eleventy watch error");
          this.watchManager.setBuildFinished();
        } else {
          this.errorHandler.fatal(e, "Eleventy fatal watch error");
          this.stopWatch();
        }
      }
    };

    watcher.on("change", async (path) => {
      this.logger.forceLog(`File changed: ${path}`);
      await watchRun(path);
    });

    watcher.on("add", async (path) => {
      this.logger.forceLog(`File added: ${path}`);
      await watchRun(path);
    });

    process.on("SIGINT", () => this.stopWatch());
  }

  stopWatch() {
    debug("Cleaning up chokidar and browsersync (if exists) instances.");
    this.eleventyServe.close();
    this.watcher.close();
    process.exit();
  }

  /**
   * Serve Eleventy on this port.
   *
   * @param {Number} port - The HTTP port to serve Eleventy from.
   */
  serve(port) {
    this.eleventyServe.serve(port);
  }

  /**
   * Writes templates to the file system.
   *
   * @async
   * @method
   * @returns {Promise<{}>}
   */
  async write() {
    return this.executeBuild();
  }

  /**
   * Renders templates to a JSON object.
   *
   * @async
   * @method
   * @returns {Promise<{}>}
   */
  async toJSON() {
    return this.executeBuild("json");
  }

  /**
   * Returns a stream of new line delimited (NDJSON) objects
   *
   * @async
   * @method
   * @returns {Promise<{ReadableStream}>}
   */
  async toNDJSON() {
    return this.executeBuild("ndjson");
  }

  /**
   * tbd.
   *
   * @async
   * @method
   * @returns {Promise<{}>} ret - tbd.
   */
  async executeBuild(to = "fs") {
    if (this.needsInit) {
      if (!this._initing) {
        this._initing = this.init();
      }
      await this._initing;
      this.needsInit = false;
    }

    if (!this.writer) {
      this.errorHandler.fatal(
        new Error(
          "Eleventy didn’t run init() properly and wasn’t able to create a TemplateWriter."
        ),
        "Problem writing Eleventy templates"
      );
    }

    let ret;
    let hasError = false;

    try {
      let eventsArg = {
        inputDir: this.config.inputDir,
      };
      await this.config.events.emit("beforeBuild", eventsArg);
      await this.config.events.emit("eleventy.before", eventsArg);

      let promise;
      if (to === "fs") {
        promise = this.writer.write();
      } else if (to === "json") {
        promise = this.writer.getJSON("json");
      } else if (to === "ndjson") {
        promise = this.writer.getJSON("ndjson");
      } else {
        throw new Error(
          `Invalid argument for \`Eleventy->executeBuild(${to})\`, expected "json", "ndjson", or "fs".`
        );
      }

      ret = await promise;

      if (to === "ndjson") {
        // return a stream
        // TODO this might output the ndjson rows only after all the templates have been written to the stream?
        ret = this.logger.closeStream(to);
      }

      await this.config.events.emit("afterBuild", eventsArg);
      await this.config.events.emit("eleventy.after", eventsArg);
    } catch (e) {
      hasError = true;
      ret = {
        error: e,
      };
      this.errorHandler.fatal(e, "Problem writing Eleventy templates");
    } finally {
      bench.finish();
      if (to === "fs") {
        this.logger.message(
          this.logFinished(),
          "info",
          hasError ? "red" : "green",
          true
        );
      }
      debug("Finished writing templates.");

      debug(`
      Getting frustrated? Have a suggestion/feature request/feedback?
      I want to hear it! Open an issue: https://github.com/11ty/eleventy/issues/new`);
    }

    return ret;
  }
}

module.exports = Eleventy;
module.exports.EleventyServerless = require("./Serverless");
module.exports.EleventyServerlessBundlerPlugin = require("./Plugins/ServerlessBundlerPlugin");
module.exports.EleventyRenderPlugin = require("./Plugins/RenderPlugin");
