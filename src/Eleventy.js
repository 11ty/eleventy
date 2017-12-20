const watch = require("glob-watcher");
const TemplateConfig = require("./TemplateConfig");
const TemplateData = require("./TemplateData");
const TemplateWriter = require("./TemplateWriter");
const pkg = require("../package.json");

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();

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

Eleventy.prototype.getElapsedTime = function() {
  let time = ((new Date() - this.start) / 1000).toFixed(2);
  return `Finished in ${time} second` + (time !== 1 ? "s" : "");
};

Eleventy.prototype.init = async function() {
  this.data = new TemplateData(this.input);

  this.writer = new TemplateWriter(
    this.input,
    this.output,
    this.formats,
    this.data
  );

  return this.data.cacheData();
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
  out.push("       eleventy --input=./templates --output=./dist");
  out.push("");
  out.push("arguments: ");
  out.push("  --version");
  out.push("  --watch");
  out.push("       Wait for files to change and automatically rewrite.");
  out.push("  --input");
  out.push("       Input template files (default: `templates`)");
  out.push("  --output");
  out.push("       Write HTML output to this folder (default: `dist`)");
  out.push("  --formats=liquid,md");
  out.push("       Whitelist only certain template types (default: `*`)");
  out.push("  --data");
  out.push("       Set your own global data file (default: `data.json`)");
  // out.push( "  --config" );
  // out.push( "       Set your own local configuration file (default: `.eleventy.js`)" );
  out.push("  --help");
  out.push("       Show this message.");
  return out.join("\n");
};

Eleventy.prototype.watch = function() {
  console.log("Watching…");
  var watcher = watch(this.writer.getRawFiles(), {
    ignored: this.writer.getWatchedIgnores()
  });

  watcher.on(
    "change",
    function(path, stat) {
      console.log("File changed:", path);
      this.writer.write();
    }.bind(this)
  );

  watcher.on(
    "add",
    function(path, stat) {
      console.log("File added:", path);
      this.writer.write();
    }.bind(this)
  );
};

Eleventy.prototype.write = async function() {
  return this.writer.write();
};

module.exports = Eleventy;
