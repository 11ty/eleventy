const watch = require("glob-watcher");
const chalk = require("chalk");
const TemplateConfig = require("./TemplateConfig");
const TemplateData = require("./TemplateData");
const TemplateWriter = require("./TemplateWriter");
const EleventyError = require("./EleventyError");
const pkg = require("../package.json");

let cfg = TemplateConfig.getDefaultConfig();

function Eleventy(input, output) {
  this.input = input || cfg.dir.input;
  this.output = output || cfg.dir.output;
  this.formats = cfg.templateFormats;
  this.data = null;
  this.start = new Date();
}

Eleventy.prototype.restart = function() {
  this.start = new Date();
};

Eleventy.prototype._simplePlural = function(count, singleWord, pluralWord) {
  return count === 1 ? singleWord : pluralWord;
};

Eleventy.prototype.getFinishedLog = function() {
  if (!this.writer) {
    throw new Error(
      "Did you call Eleventy.init to create the TemplateWriter instance? Hint: you probably didn’t."
    );
  }

  let ret = [];

  let writeCount = this.writer.getWriteCount();
  ret.push(
    `Wrote ${writeCount} ${this._simplePlural(writeCount, "file", "files")}`
  );

  let time = ((new Date() - this.start) / 1000).toFixed(2);
  ret.push(`in ${time} ${this._simplePlural(time, "second", "seconds")}`);

  return ret.join(" ");
};

Eleventy.prototype.init = async function() {
  this.data = new TemplateData(this.input);

  this.writer = new TemplateWriter(
    this.input,
    this.output,
    this.formats,
    this.data
  );

  this.writer.setVerboseOutput(this.isVerbose);

  return this.data.cacheData();
};

Eleventy.prototype.setIsVerbose = function(isVerbose) {
  this.isVerbose = !!isVerbose;

  if (this.writer) {
    this.writer.setVerboseOutput(this.isVerbose);
  }
};

Eleventy.prototype.setFormats = function(formats) {
  if (formats && formats !== "*") {
    this.formats = formats.split(",");
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
  out.push("  --input");
  out.push("       Input template files (default: `.`)");
  out.push("  --output");
  out.push("       Write HTML output to this folder (default: `_site`)");
  out.push("  --formats=liquid,md");
  out.push("       Whitelist only certain template types (default: `*`)");
  out.push("  --quiet");
  out.push("       Don’t print all written files (default: `false`)");
  // out.push( "  --config" );
  // out.push( "       Set your own local configuration file (default: `.eleventy.js`)" );
  out.push("  --help");
  return out.join("\n");
};

Eleventy.prototype.watch = async function() {
  await this.write();

  console.log("Watching…");
  var watcher = watch(this.writer.getRawFiles(), {
    ignored: this.writer.getWatchedIgnores()
  });

  watcher.on(
    "change",
    async function(path, stat) {
      console.log("File changed:", path);
      await this.write();
      console.log("Watching…");
    }.bind(this)
  );

  watcher.on(
    "add",
    async function(path, stat) {
      console.log("File added:", path);
      await this.write();
      console.log("Watching…");
    }.bind(this)
  );
};

Eleventy.prototype.write = async function() {
  try {
    return await this.writer.write();
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
