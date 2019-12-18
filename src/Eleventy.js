const pkg = require("../package.json");
const TemplatePath = require("./TemplatePath");
const TemplateData = require("./TemplateData");
const TemplateWriter = require("./TemplateWriter");
const EleventyErrorHandler = require("./EleventyErrorHandler");
const EleventyServe = require("./EleventyServe");
const EleventyWatchTargets = require("./EleventyWatchTargets");
const EleventyFiles = require("./EleventyFiles");
const templateCache = require("./TemplateCache");
const simplePlural = require("./Util/Pluralize");
const config = require("./Config");
const bench = require("./BenchmarkManager");
const debug = require("debug")("Eleventy");
const deleteRequireCache = require("./Util/DeleteRequireCache");

/**
 * @module @11ty/eleventy/Eleventy
 */

/**
 * Runtime of eleventy.
 *
 * @param {String} input - Where to read files from.
 * @param {String} output - Where to write rendered files to.
 * @returns {undefined}
 */
class Eleventy {
  constructor(input, output) {
    /** @member {Object} - tbd. */
    this.config = config.getConfig();

    /**
     * @member {String} - The path to Eleventy's config file.
     * @default null
     */
    this.configPath = null;

    /**
     * @member {Boolean} - Is Eleventy running in verbose mode?
     * @default true
     */
    this.isVerbose = process.env.DEBUG ? false : !this.config.quietMode;

    /**
     * @member {Boolean} - Was verbose mode overrode manually?
     * @default false
     */
    this.isVerboseOverride = false;

    /**
     * @member {Boolean} - Is Eleventy running in debug mode?
     * @default false
     */
    this.isDebug = false;

    /**
     * @member {Boolean} - Is Eleventy running in dry mode?
     * @default false
     */
    this.isDryRun = false;

    /** @member {Date} - The time of instantiation. */
    this.start = new Date();

    /**
     * @member {Array<String>} - Subset of template types.
     * @default null
     */
    this.formatsOverride = null;

    /** @member {Object} - tbd. */
    this.eleventyServe = new EleventyServe();

    /** @member {String} - Holds the path to the input directory. */
    this.rawInput = input;

    /** @member {String} - Holds the path to the output directory. */
    this.rawOutput = output;

    /** @member {Object} - tbd. */
    this.watchTargets = new EleventyWatchTargets();
    this.watchTargets.addAndMakeGlob(this.config.additionalWatchTargets);
    this.watchTargets.watchJavaScriptDependencies = this.config.watchJavaScriptDependencies;
  }

  /** @type {String} */
  get input() {
    return this.rawInput || this.config.dir.input;
  }

  /** @type {String} */
  get inputDir() {
    return TemplatePath.getDir(this.input);
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
      config.setPathPrefix(pathPrefix);
      this.config = config.getConfig();
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
   * Updates the config path.
   *
   * @method
   * @param {String} configPath - The new config path.
   */
  setConfigPathOverride(configPath) {
    if (configPath) {
      this.configPath = configPath;

      config.setProjectConfigPath(configPath);
      this.config = config.getConfig();
    }
  }

  /**
   * Restarts Eleventy.
   *
   * @async
   * @method
   */
  async restart() {
    debug("Restarting");
    this.start = new Date();
    templateCache.clear();
    bench.reset();
    this.eleventyFiles.restart();

    // reload package.json values (if applicable)
    // TODO only reset this if it changed
    deleteRequireCache(TemplatePath.absolutePath("package.json"));

    await this.init();
  }

  /**
   * Marks the finish of a run of Eleventy.
   *
   * @method
   */
  finish() {
    bench.finish();

    (this.logger || console).log(this.logFinished());
    debug("Finished writing templates.");
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
    let skippedCopyCount = this.writer.getSkippedCopyCount();

    if (copyCount) {
      ret.push(
        `Copied ${copyCount} ${simplePlural(copyCount, "item", "items")}${
          skippedCopyCount ? ` (skipped ${skippedCopyCount})` : ""
        } /`
      );
    }

    ret.push(
      `Wrote ${writeCount} ${simplePlural(writeCount, "file", "files")}${
        skippedCount ? ` (skipped ${skippedCount})` : ""
      }`
    );

    let versionStr = `v${pkg.version}`;
    let time = ((new Date() - this.start) / 1000).toFixed(2);
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
    let formats = this.formatsOverride || this.config.templateFormats;
    this.eleventyFiles = new EleventyFiles(
      this.input,
      this.outputDir,
      formats,
      this.isPassthroughAll
    );
    this.eleventyFiles.init();

    this.templateData = new TemplateData(this.inputDir);
    this.eleventyFiles.setTemplateData(this.templateData);

    this.writer = new TemplateWriter(
      this.input,
      this.outputDir,
      formats,
      this.templateData,
      this.isPassthroughAll
    );

    this.writer.setEleventyFiles(this.eleventyFiles);

    debug(`Directories:
Input: ${this.inputDir}
Data: ${this.templateData.getDataDir()}
Includes: ${this.eleventyFiles.getIncludesDir()}
Layouts: ${this.eleventyFiles.getLayoutsDir()}
Output: ${this.outputDir}
Template Formats: ${formats.join(",")}
Verbose Output: ${this.isVerbose}`);

    this.writer.setVerboseOutput(this.isVerbose);
    this.writer.setDryRun(this.isDryRun);

    return this.templateData.cacheData();
  }

  /**
   * Updates the debug mode of Eleventy.
   *
   * @method
   * @param {Boolean} isDebug - Shall Eleventy run in debug mode?
   */
  setIsDebug(isDebug) {
    this.isDebug = !!isDebug;
  }

  /**
   * Updates the verbose mode of Eleventy.
   *
   * @method
   * @param {Boolean} isVerbose - Shall Eleventy run in verbose mode?
   */
  setIsVerbose(isVerbose) {
    this.isVerbose = !!isVerbose;

    // mark that this was changed from the default (probably from --quiet)
    // this is used when we reset the config (only applies if not overridden)
    this.isVerboseOverride = true;

    if (this.writer) {
      this.writer.setVerboseOutput(this.isVerbose);
    }
    if (bench) {
      bench.setVerboseOutput(this.isVerbose);
    }
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
    return require("../package.json").version;
  }

  /**
   * Shows a help message including usage.
   *
   * @method
   * @returns {String} - The help mesage.
   */
  getHelp() {
    return `usage: eleventy
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
     --help`;
  }

  /**
   * Resets the config of Eleventy.
   *
   * @method
   */
  resetConfig() {
    config.reset();

    this.config = config.getConfig();
    this.eleventyServe.config = this.config;

    if (!this.isVerboseOverride && !process.env.DEBUG) {
      this.isVerbose = !this.config.quietMode;
    }
  }

  /**
   * tbd.
   *
   * @private
   * @method
   * @param {String} path - Watch this file.
   */
  async _watch(path) {
    if (path) {
      path = TemplatePath.addLeadingDotSlash(path);
    }

    if (this.active) {
      this.queuedToRun = path;
      return;
    }

    this.active = true;

    let isInclude =
      path &&
      TemplatePath.startsWithSubPath(path, this.eleventyFiles.getIncludesDir());
    let isJavaScriptDependency =
      path && this.watchTargets.isJavaScriptDependency(path);

    let localProjectConfigPath = config.getLocalProjectConfigFile();
    // reset and reload global configuration :O
    if (path === localProjectConfigPath) {
      this.resetConfig();
    }
    config.resetOnWatch();

    await this.restart();
    this.watchTargets.clearDependencyRequireCache();

    if (path && !isInclude && !isJavaScriptDependency && this.isIncremental) {
      this.writer.setIncrementalFile(path);
    }

    await this.write();

    if (path && !isInclude && this.isIncremental) {
      this.writer.resetIncrementalFile();
    }

    this.watchTargets.reset();
    await this._initWatchDependencies();

    // Add new deps to chokidar
    this.watcher.add(this.watchTargets.getNewTargetsSinceLastReset());

    this.eleventyServe.reload(path, isInclude);

    this.active = false;

    if (this.queuedToRun) {
      console.log("You saved while Eleventy was running, let’s run again.");
      this.queuedToRun = false;
      await this._watch(this.queuedToRun);
    } else {
      console.log("Watching…");
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
    this.watchTargets.add(this.eleventyFiles.getGlobWatcherFiles());

    // Watch the local project config file
    this.watchTargets.add(config.getLocalProjectConfigFile());

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
    this.watchTargets.addDependencies(this.eleventyFiles.getWatchPathCache());

    // Config file dependencies
    this.watchTargets.addDependencies(
      config.getLocalProjectConfigFile(),
      filterOutGlobalDataFiles.bind(this)
    );

    // Deps from Global Data (that aren’t in the global data directory, everything is watched there)
    this.watchTargets.addDependencies(
      this.templateData.getWatchPathCache(),
      filterOutGlobalDataFiles.bind(this)
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

  /**
   * Start the watching of files.
   *
   * @async
   * @method
   */
  async watch() {
    this.watcherBench.setMinimumThresholdMs(500);
    this.watcherBench.reset();

    const chokidar = require("chokidar");

    this.active = false;
    this.queuedToRun = false;

    // Note that watching indirectly depends on this for fetching dependencies from JS files
    // See: TemplateWriter:pathCache and EleventyWatchTargets
    await this.write();

    await this.initWatch();

    // TODO improve unwatching if JS dependencies are removed (or files are deleted)
    let rawFiles = await this.getWatchedFiles();
    debug("Watching for changes to: %o", rawFiles);

    let ignores = this.eleventyFiles.getGlobWatcherIgnores();
    debug("Ignoring watcher changes to: %o", ignores);
    let watcher = chokidar.watch(rawFiles, {
      ignored: ignores,
      ignoreInitial: true
    });

    this.watcherBench.finish("Initialize --watch", 10, this.isVerbose);

    console.log("Watching…");

    this.watcher = watcher;

    async function watchRun(path) {
      try {
        await this._watch(path);
      } catch (e) {
        EleventyErrorHandler.fatal(e, "Eleventy fatal watch error");
        watcher.close();
      }
    }

    watcher.on("change", async path => {
      console.log("File changed:", path);
      await watchRun.call(this, path);
    });

    watcher.on("add", async path => {
      console.log("File added:", path);
      await watchRun.call(this, path);
    });

    process.on(
      "SIGINT",
      function() {
        debug("Cleaning up chokidar and browsersync (if exists) instances.");
        this.eleventyServe.close();
        this.watcher.close();
        process.exit();
      }.bind(this)
    );
  }

  /**
   * Serve Eleventy on this port.
   *
   * @param {Number} port - The HTTP port to serve Eleventy from.
   */
  serve(port) {
    this.eleventyServe.serve(port);
  }

  /* For testing */
  /**
   * Updates the logger.
   *
   * @param {} logger - The new logger.
   */
  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * tbd.
   *
   * @async
   * @method
   * @returns {Promise<{}>} ret - tbd.
   */
  async write() {
    let ret;
    if (this.logger) {
      EleventyErrorHandler.logger = this.logger;
    }

    try {
      let promise = this.writer.write();

      ret = await promise;
    } catch (e) {
      EleventyErrorHandler.initialMessage(
        "Problem writing Eleventy templates",
        "error",
        "red"
      );
      EleventyErrorHandler.fatal(e);
    }

    this.finish();

    debug(`
Getting frustrated? Have a suggestion/feature request/feedback?
I want to hear it! Open an issue: https://github.com/11ty/eleventy/issues/new`);

    // unset the logger
    EleventyErrorHandler.logger = undefined;

    return ret;
  }
}

module.exports = Eleventy;
