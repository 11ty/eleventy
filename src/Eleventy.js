const TemplatePath = require("./TemplatePath");
const TemplateData = require("./TemplateData");
const TemplateWriter = require("./TemplateWriter");
const EleventyErrorHandler = require("./EleventyErrorHandler");
const EleventyServe = require("./EleventyServe");
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

Eleventy.prototype.setConfigPath = function(configPath) {
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
  delete require.cache[TemplatePath.localPath("package.json")];

  this.initDirs();
  await this.init();
};

Eleventy.prototype.finish = function() {
  bench.finish();

  console.log(this.logFinished());
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

  // reset and reload global configuration :O
  if (path === config.getLocalProjectConfigFile()) {
    this.resetConfig();
  }
  config.resetOnWatch();

  await this.restart();
  await this.write();

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

Eleventy.prototype.watch = async function() {
  this.active = false;
  this.queuedToRun = false;

  await this.write();

  const watch = require("glob-watcher");

  let rawFiles = this.eleventyFiles.getGlobWatcherFiles();
  // Watch the local project config file
  rawFiles.push(config.getLocalProjectConfigFile());
  rawFiles = rawFiles.concat(
    await this.eleventyFiles.getGlobWatcherTemplateDataFiles()
  );
  debug("Watching for changes to: %o", rawFiles);

  console.log("Watching…");
  let watcher = watch(rawFiles, {
    ignored: this.eleventyFiles.getGlobWatcherIgnores()
  });

  watcher.on("change", async path => {
    console.log("File changed:", path);
    this._watch(path);
  });

  watcher.on("add", async path => {
    console.log("File added:", path);
    this._watch(path);
  });
};

Eleventy.prototype.serve = function(port) {
  this.eleventyServe.serve(port);
};

Eleventy.prototype.write = async function() {
  let ret;
  try {
    let promise = this.writer.write();

    ret = await promise;
  } catch (e) {
    EleventyErrorHandler.initialMessage(
      "Problem writing Eleventy templates",
      "error",
      "red"
    );
    EleventyErrorHandler.log(e);
  }

  this.finish();

  debug(`
Getting frustrated? Have a suggestion/feature request/feedback?
I want to hear it! Open an issue: https://github.com/11ty/eleventy/issues/new`);

  return ret;
};

module.exports = Eleventy;
