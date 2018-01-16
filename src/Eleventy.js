const fs = require("fs");
const watch = require("glob-watcher");
const chalk = require("chalk");
const parsePath = require("parse-filepath");
const TemplateData = require("./TemplateData");
const TemplateWriter = require("./TemplateWriter");
const EleventyError = require("./EleventyError");
const simplePlural = require("./Util/Pluralize");
const config = require("./Config");
const pkg = require("../package.json");
const debug = require("debug")("Eleventy");

function Eleventy(input, output) {
  this.config = config.getConfig();
  this.rawInput = input;
  this.rawOutput = output;
  this.configPath = null;
  this.data = null;
  this.isVerbose = true;
  this.isDebug = false;

  this.start = new Date();
  this.formatsOverride = null;

  this.initDirs(input, output);
}

Eleventy.prototype.initDirs = function() {
  this.input = this.rawInput || this.config.dir.input;
  this.inputDir = this._getDir(this.input) || ".";
  this.outputDir = this.rawOutput || this.config.dir.output;
};

Eleventy.prototype._getDir = function(inputPath) {
  if (!fs.statSync(inputPath).isDirectory()) {
    return parsePath(inputPath).dir;
  }
  return inputPath;
};

Eleventy.prototype.setConfigPath = function(configPath) {
  if (configPath) {
    this.configPath = configPath;

    config.setProjectConfigPath(configPath);
    this.config = config.getConfig();

    this.initDirs();
  }
};

Eleventy.prototype.restart = function() {
  debug("Restarting");
  this.start = new Date();
  this.writer.restart();
};

Eleventy.prototype.finish = function() {
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
  ret.push(`Wrote ${writeCount} ${simplePlural(writeCount, "file", "files")}`);

  let time = ((new Date() - this.start) / 1000).toFixed(2);
  ret.push(`in ${time} ${simplePlural(time, "second", "seconds")}`);

  return ret.join(" ");
};

Eleventy.prototype.init = async function() {
  this.data = new TemplateData(this.inputDir);

  let formats = this.formatsOverride || this.config.templateFormats;

  this.writer = new TemplateWriter(
    this.input,
    this.outputDir,
    formats,
    this.data
  );

  // TODO maybe isVerbose -> console.log?
  debug(`Directories:
Input: ${this.inputDir}
Data: ${this.data.getDataDir()}
Includes: ${this.writer.getIncludesDir()}
Output: ${this.outputDir}
Template Formats: ${formats.join(",")}`);

  this.writer.setVerboseOutput(this.isVerbose);

  return this.data.cacheData();
};

Eleventy.prototype.setIsDebug = function(isDebug) {
  this.isDebug = !!isDebug;
};

Eleventy.prototype.setIsVerbose = function(isVerbose) {
  this.isVerbose = !!isVerbose;

  if (this.writer) {
    this.writer.setVerboseOutput(this.isVerbose);
  }
};

Eleventy.prototype.setFormats = function(formats) {
  if (formats && formats !== "*") {
    this.formatsOverride = formats.split(",");
  }
};

Eleventy.prototype.getVersion = function() {
  return pkg.version;
};

Eleventy.prototype.getHelp = function() {
  let out = [];
  out.push("usage: eleventy");
  out.push("       eleventy --watch");
  out.push("       eleventy --input=. --output=./_site");
  out.push("");
  out.push("Arguments: ");
  out.push("  --version");
  out.push("  --watch");
  out.push("       Wait for files to change and automatically rewrite");
  out.push("  --input=.");
  out.push("       Input template files (default: `.`)");
  out.push("  --output=_site");
  out.push("       Write HTML output to this folder (default: `_site`)");
  out.push("  --formats=liquid,md");
  out.push("       Whitelist only certain template types (default: `*`)");
  out.push("  --quiet");
  out.push("       Don’t print all written files (default: `false`)");
  out.push("  --config=filename.js");
  out.push(
    "      Override the eleventy config file path (default: `.eleventy.js`)"
  );
  out.push("  --help");
  return out.join("\n");
};

Eleventy.prototype._watch = async function() {
  this.restart();
  await this.write();
  console.log("Watching…");
};

Eleventy.prototype.watch = async function() {
  await this.write();

  console.log("Watching…");
  let watcher = watch(this.writer.getRawFiles(), {
    ignored: this.writer.getWatchedIgnores()
  });

  watcher.on(
    "change",
    async function(path, stat) {
      console.log("File changed:", path);
      this._watch();
    }.bind(this)
  );

  watcher.on(
    "add",
    async function(path, stat) {
      console.log("File added:", path);
      this._watch();
    }.bind(this)
  );
};

Eleventy.prototype.write = async function() {
  try {
    let ret = await this.writer.write();
    this.finish();

    debug(`
Getting frustrated? Have a suggestion/feature request/feedback?
I want to hear it! Open an issue: https://github.com/11ty/eleventy/issues/new`);

    return ret;
  } catch (e) {
    console.log("\n" + chalk.red("Problem writing eleventy templates: "));
    if (e instanceof EleventyError) {
      console.log(chalk.red(e.log()));
      console.log("\n" + e.dump());
    } else {
      console.log(e);
    }
  }
};

module.exports = Eleventy;
