const globby = require("globby");
const fs = require("fs-extra");
const parsePath = require("parse-filepath");
const Template = require("./Template");
const TemplatePath = require("./TemplatePath");
const TemplateMap = require("./TemplateMap");
const TemplateRender = require("./TemplateRender");
const TemplatePassthroughManager = require("./TemplatePassthroughManager");
const EleventyError = require("./EleventyError");
const TemplateGlob = require("./TemplateGlob");
const EleventyExtensionMap = require("./EleventyExtensionMap");
const eleventyConfig = require("./EleventyConfig");
const config = require("./Config");
const debug = require("debug")("Eleventy:TemplateWriter");
const debugDev = require("debug")("Dev:Eleventy:TemplateWriter");

function TemplateWriter(inputPath, outputDir, templateKeys, templateData) {
  this.config = config.getConfig();
  this.input = inputPath;
  this.inputDir = this._getInputPathDir(inputPath);
  this.templateKeys = templateKeys;
  this.outputDir = outputDir;
  this.templateData = templateData;
  this.isVerbose = true;
  this.isDryRun = false;
  this.writeCount = 0;

  this.includesDir = this.inputDir + "/" + this.config.dir.includes;
  // Duplicated with TemplateData.getDataDir();
  this.dataDir = this.inputDir + "/" + this.config.dir.data;

  this.extensionMap = new EleventyExtensionMap(this.templateKeys);

  this.setPassthroughManager();

  // Input was a directory
  if (this.input === this.inputDir) {
    this.templateGlobs = TemplateGlob.map(
      this.extensionMap.getGlobs(this.inputDir)
    );
  } else {
    this.templateGlobs = TemplateGlob.map([inputPath]);
  }

  this.cachedIgnores = this.getIgnores();
  this.watchedGlobs = this.templateGlobs.concat(this.cachedIgnores);
  this.templateGlobsWithIgnores = this.watchedGlobs.concat(
    this.getTemplateIgnores()
  );
}

TemplateWriter.prototype.setPassthroughManager = function(mgr) {
  if (!mgr) {
    mgr = new TemplatePassthroughManager();
    mgr.setInputDir(this.inputDir);
    mgr.setOutputDir(this.outputDir);
  }

  this.passthroughManager = mgr;
};

TemplateWriter.prototype.restart = function() {
  this.writeCount = 0;
  this.passthroughManager.reset();
  this.cachedPaths = null;
  debugDev("Resetting counts to 0");
};

TemplateWriter.prototype.getIncludesDir = function() {
  return this.includesDir;
};

TemplateWriter.prototype.getDataDir = function() {
  return this.dataDir;
};

TemplateWriter.prototype._getInputPathDir = function(inputPath) {
  // Input points to a file
  if (!TemplatePath.isDirectorySync(inputPath)) {
    return parsePath(inputPath).dir;
  }

  // Input is a dir
  if (inputPath) {
    return inputPath;
  }

  return ".";
};

TemplateWriter.prototype.getFiles = function() {
  return this.templateGlobsWithIgnores;
};

TemplateWriter.prototype.getRawFiles = function() {
  return this.templateGlobs;
};

TemplateWriter.getFileIgnores = function(
  ignoreFile,
  defaultIfFileDoesNotExist
) {
  let dir = parsePath(ignoreFile).dir || ".";
  let ignorePath = TemplatePath.normalize(ignoreFile);
  let ignoreContent;
  try {
    ignoreContent = fs.readFileSync(ignorePath, "utf-8");
  } catch (e) {
    ignoreContent = defaultIfFileDoesNotExist || "";
  }

  let ignores = [];

  if (ignoreContent) {
    ignores = ignoreContent
      .split("\n")
      .map(line => {
        return line.trim();
      })
      .filter(line => {
        // empty lines or comments get filtered out
        return line.length > 0 && line.charAt(0) !== "#";
      })
      .map(line => {
        let path = TemplateGlob.normalizePath(dir, "/", line);
        debug(`${ignoreFile} ignoring: ${path}`);
        try {
          let stat = fs.statSync(path);
          if (stat.isDirectory()) {
            return "!" + path + "/**";
          }
          return "!" + path;
        } catch (e) {
          return "!" + path;
        }
      });
  }

  return ignores;
};

TemplateWriter.prototype.getGlobWatcherFiles = function() {
  // TODO is it better to tie the includes and data to specific file extensions or keep the **?
  return this.templateGlobs
    .concat(this.getIncludesAndDataDirs())
    .concat(this.getPassthroughPaths());
};

TemplateWriter.prototype.getGlobWatcherIgnores = function() {
  // convert to format without ! since they are passed in as a separate argument to glob watcher
  return this.cachedIgnores.map(ignore =>
    TemplatePath.stripLeadingDotSlash(ignore.substr(1))
  );
};

TemplateWriter.prototype.getIgnores = function() {
  let files = [];

  files = files.concat(
    TemplateWriter.getFileIgnores(
      this.inputDir + "/.gitignore",
      "node_modules/"
    )
  );

  files = files.concat(
    TemplateWriter.getFileIgnores(this.inputDir + "/.eleventyignore")
  );

  files = files.concat(TemplateGlob.map("!" + this.outputDir + "/**"));

  return files;
};

TemplateWriter.prototype.getPassthroughPaths = function() {
  let paths = [];
  paths = paths.concat(this.passthroughManager.getConfigPathGlobs());
  // These are already added in the root templateGlobs
  // paths = paths.concat(this.extensionMap.getPrunedGlobs(this.inputDir));
  return paths;
};

TemplateWriter.prototype.getIncludesAndDataDirs = function() {
  let files = [];
  if (this.config.dir.includes) {
    files = files.concat(TemplateGlob.map(this.includesDir + "/**"));
  }

  if (this.config.dir.data && this.config.dir.data !== ".") {
    files = files.concat(TemplateGlob.map(this.dataDir + "/**"));
  }

  return files;
};

TemplateWriter.prototype.getTemplateIgnores = function() {
  return this.getIncludesAndDataDirs().map(function(dir) {
    return "!" + dir;
  });
};

TemplateWriter.prototype._getAllPaths = async function() {
  debug("Searching for: %o", this.templateGlobsWithIgnores);
  if (!this.cachedPaths) {
    // Note the gitignore: true option for globby is _really slow_
    this.cachedPaths = await globby(this.templateGlobsWithIgnores); //, { gitignore: true });
  }

  return this.cachedPaths;
};

TemplateWriter.prototype._getTemplate = function(path) {
  let tmpl = new Template(
    path,
    this.inputDir,
    this.outputDir,
    this.templateData
  );

  tmpl.setIsVerbose(this.isVerbose);
  tmpl.setDryRun(this.isDryRun);

  /*
   * Sample filter: arg str, return pretty HTML string
   * function(str) {
   *   return pretty(str, { ocd: true });
   * }
   */
  for (let filterName in this.config.filters) {
    let filter = this.config.filters[filterName];
    if (typeof filter === "function") {
      tmpl.addTransform(filter);
    }
  }

  return tmpl;
};

TemplateWriter.prototype._createTemplateMap = async function(paths) {
  this.templateMap = new TemplateMap();

  for (let path of paths) {
    if (TemplateRender.hasEngine(path)) {
      await this.templateMap.add(this._getTemplate(path));
      debug(`Template for ${path} added to map.`);
    }
  }

  await this.templateMap.cache();
  debugDev(`TemplateMap cache complete.`);
  return this.templateMap;
};

TemplateWriter.prototype._writeTemplate = async function(mapEntry) {
  let outputPath = mapEntry.outputPath;
  let data = mapEntry.data;
  let tmpl = mapEntry.template;

  try {
    await tmpl.write(outputPath, data);
  } catch (e) {
    throw EleventyError.make(
      new Error(`Having trouble writing template: ${outputPath}`),
      e
    );
  }

  this.writeCount += tmpl.getWriteCount();
  return tmpl;
};

TemplateWriter.prototype.write = async function() {
  let paths = await this._getAllPaths();
  debug("Found: %o", paths);

  await this.passthroughManager.copyAll(paths);
  await this._createTemplateMap(paths);
  for (let mapEntry of this.templateMap.getMap()) {
    await this._writeTemplate(mapEntry);
  }

  eleventyConfig.emit(
    "alldata",
    this.templateMap.getCollection().getAllSorted()
  );
  debug("`alldata` event triggered.");
};

TemplateWriter.prototype.setVerboseOutput = function(isVerbose) {
  this.isVerbose = isVerbose;
};

TemplateWriter.prototype.setDryRun = function(isDryRun) {
  this.isDryRun = !!isDryRun;

  this.passthroughManager.setDryRun(this.isDryRun);
};

TemplateWriter.prototype.getCopyCount = function() {
  return this.passthroughManager.getCopyCount();
};

TemplateWriter.prototype.getWriteCount = function() {
  return this.writeCount;
};

module.exports = TemplateWriter;
