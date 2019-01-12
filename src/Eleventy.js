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

function Eleventy(input, output) {
  this.config = config.getConfig();
  this.configPath = null;
  this.isVerbose = true;
  this.isDebug = false;
  this.isDryRun = false;

  this.start = new Date();
  this.formatsOverride = null;
  this.eleventyServe = new EleventyServe();

  this.rawInput = input;
  this.rawOutput = output;

  this.watchTargets = new EleventyWatchTargets();
  this.watchTargets.watchJavaScriptDependencies = this.config.watchJavaScriptDependencies;

  this.initDirs();
}

Eleventy.prototype.initDirs = function() {
  this.input = this.rawInput || this.config.dir.input;
  this.inputDir = TemplatePath.getDir(this.input);
  this.outputDir = this.rawOutput || this.config.dir.output;

  this.eleventyServe.setOutputDir(this.outputDir);
};

Eleventy.prototype.setDryRun = function(isDryRun) {
  this.isDryRun = !!isDryRun;
};

Eleventy.prototype.setPassthroughAll = function(isPassthroughAll) {
  this.isPassthroughAll = !!isPassthroughAll;
};

Eleventy.prototype.setPathPrefix = function(pathPrefix) {
  if (pathPrefix || pathPrefix === "") {
    config.setPathPrefix(pathPrefix);
    this.config = config.getConfig();
  }
};

Eleventy.prototype.setWatchTargets = function(watchTargets) {
  this.watchTargets = watchTargets;
};

Eleventy.prototype.setConfigPathOverride = function(configPath) {
  if (configPath) {
    this.configPath = configPath;

    config.setProjectConfigPath(configPath);
    this.config = config.getConfig();

    this.initDirs();
  }
};

Eleventy.prototype.restart = async function() {
  debug("Restarting");
  this.start = new Date();
  templateCache.clear();
  bench.reset();
  this.eleventyFiles.restart();

  // reload package.json values (if applicable)
  // TODO only reset this if it changed
  delete require.cache[TemplatePath.localPath("package.json")];

  this.initDirs();
  await this.init();
};

Eleventy.prototype.finish = function() {
  bench.finish();

  (this.logger || console).log(this.logFinished());
  debug("Finished writing templates.");
};

Eleventy.prototype.logFinished = function() {
  if (!this.writer) {
    throw new Error(
      "Did you call Eleventy.init to create the TemplateWriter instance? Hint: you probably didn’t."
    );
  }

  let ret = [];

  let writeCount = this.writer.getWriteCount();
  let copyCount = this.writer.getCopyCount();
  if (this.isDryRun) {
    ret.push("Pretended to");
  }
  if (copyCount) {
    ret.push(
      `${this.isDryRun ? "Copy" : "Copied"} ${copyCount} ${simplePlural(
        copyCount,
        "item",
        "items"
      )} and`
    );
  }
  ret.push(
    `${this.isDryRun ? "Process" : "Processed"} ${writeCount} ${simplePlural(
      writeCount,
      "file",
      "files"
    )}`
  );

  let time = ((new Date() - this.start) / 1000).toFixed(2);
  ret.push(`in ${time} ${simplePlural(time, "second", "seconds")}`);

  if (writeCount >= 10) {
    ret.push(`(${((time * 1000) / writeCount).toFixed(1)}ms each)`);
  }

  return ret.join(" ");
};

Eleventy.prototype.init = async function() {
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

  // TODO maybe isVerbose -> console.log?
  debug(`Directories:
Input: ${this.inputDir}
Data: ${this.templateData.getDataDir()}
Includes: ${this.eleventyFiles.getIncludesDir()}
Output: ${this.outputDir}
Template Formats: ${formats.join(",")}`);

  this.writer.setVerboseOutput(this.isVerbose);
  this.writer.setDryRun(this.isDryRun);

  return this.templateData.cacheData();
};

Eleventy.prototype.setIsDebug = function(isDebug) {
  this.isDebug = !!isDebug;
};

Eleventy.prototype.setIsVerbose = function(isVerbose) {
  this.isVerbose = !!isVerbose;

  if (this.writer) {
    this.writer.setVerboseOutput(this.isVerbose);
  }
  if (bench) {
    bench.setVerboseOutput(this.isVerbose);
  }
};

Eleventy.prototype.setFormats = function(formats) {
  if (formats && formats !== "*") {
    this.formatsOverride = formats.split(",");
  }
};

Eleventy.prototype.getVersion = function() {
  return require("../package.json").version;
};

Eleventy.prototype.getHelp = function() {
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
};

Eleventy.prototype.resetConfig = function() {
  config.reset();

  this.config = config.getConfig();
  this.eleventyServe.updateConfig(this.config);
};

Eleventy.prototype._watch = async function(path) {
  if (this.active) {
    this.queuedToRun = path;
    return;
  }

  this.active = true;

  let localProjectConfigPath = config.getLocalProjectConfigFile();
  // reset and reload global configuration :O
  if (path === localProjectConfigPath) {
    this.resetConfig();
  }
  config.resetOnWatch();

  await this.restart();
  this.watchTargets.clearDependencyRequireCache();

  await this.write();

  this.watchTargets.reset();
  await this._initWatchDependencies();

  // Add new deps to chokidar
  this.watcher.add(this.watchTargets.getNewTargetsSinceLastReset());

  let isInclude =
    path && TemplatePath.contains(path, this.eleventyFiles.getIncludesDir());
  this.eleventyServe.reload(path, isInclude);

  this.active = false;

  if (this.queuedToRun) {
    console.log("You saved while Eleventy was running, let’s run again.");
    this.queuedToRun = false;
    await this._watch(this.queuedToRun);
  } else {
    console.log("Watching…");
  }
};

Eleventy.prototype.getWatcher = function() {
  return this.watcher;
};

Eleventy.prototype.initWatch = async function() {
  this.watchTargets.add(this.eleventyFiles.getGlobWatcherFiles());

  // Watch the local project config file
  this.watchTargets.add(config.getLocalProjectConfigFile());

  // Template and Directory Data Files
  this.watchTargets.add(
    await this.eleventyFiles.getGlobWatcherTemplateDataFiles()
  );

  if (!this.watcherBench) {
    this.watcherBench = bench.get("Watcher");
  }
  let benchmark = this.watcherBench.get(
    "Watching JavaScript Dependencies (disable with `eleventyConfig.setWatchJavaScriptDependencies(false)`)"
  );
  benchmark.before();
  await this._initWatchDependencies();
  benchmark.after();
};

Eleventy.prototype._initWatchDependencies = async function() {
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
};

Eleventy.prototype.getWatchedFiles = async function() {
  return this.watchTargets.getTargets();
};

Eleventy.prototype.watch = async function() {
  this.watcherBench = bench.get("Watcher");
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
  debug("Watching but ignoring changes to: %o", ignores);

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
};

Eleventy.prototype.serve = function(port) {
  this.eleventyServe.serve(port);
};

/* For testing */
Eleventy.prototype.setLogger = function(logger) {
  this.logger = logger;
};

Eleventy.prototype.write = async function() {
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
};

module.exports = Eleventy;
