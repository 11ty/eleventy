const globby = require("globby");
const fs = require("fs-extra");
const parsePath = require("parse-filepath");
const Template = require("./Template");
const TemplatePath = require("./TemplatePath");
const TemplateMap = require("./TemplateMap");
const TemplateRender = require("./TemplateRender");
const TemplatePassthrough = require("./TemplatePassthrough");
const EleventyError = require("./EleventyError");
const TemplateGlob = require("./TemplateGlob");
const eleventyConfig = require("./EleventyConfig");
const config = require("./Config");
const debug = require("debug")("Eleventy:TemplateWriter");
const debugDev = require("debug")("Dev:Eleventy:TemplateWriter");

function TemplateWriter(inputPath, outputDir, extensions, templateData) {
  this.config = config.getConfig();
  this.input = inputPath;
  this.inputDir = this._getInputPathDir(inputPath);
  this.templateExtensions = extensions;
  this.outputDir = outputDir;
  this.templateData = templateData;
  this.isVerbose = true;
  this.isDryRun = false;
  this.writeCount = 0;
  this.copyCount = 0;

  this.includesDir = this.inputDir + "/" + this.config.dir.includes;
  // Duplicated with TemplateData.getDataDir();
  this.dataDir = this.inputDir + "/" + this.config.dir.data;

  // Input was a directory
  if (this.input === this.inputDir) {
    this.rawFiles = TemplateGlob.map(
      this.templateExtensions.map(
        function(extension) {
          return this.inputDir + "/**/*." + extension;
        }.bind(this)
      )
    );
  } else {
    this.rawFiles = TemplateGlob.map([inputPath]);
  }

  this.watchedFiles = this.addIgnores(this.inputDir, this.rawFiles);
  this.files = this.addWritingIgnores(this.inputDir, this.watchedFiles);

  this.templateMap;
}

TemplateWriter.prototype.restart = function() {
  this.writeCount = 0;
  this.copyCount = 0;
  debug("Resetting counts to 0");
};

TemplateWriter.prototype.getIncludesDir = function() {
  return this.includesDir;
};

TemplateWriter.prototype.getDataDir = function() {
  return this.dataDir;
};

TemplateWriter.prototype._getInputPathDir = function(inputPath) {
  // Input points to a file
  if (!fs.statSync(inputPath).isDirectory()) {
    return parsePath(inputPath).dir;
  }

  // Input is a dir
  if (inputPath) {
    return inputPath;
  }

  return ".";
};

TemplateWriter.prototype.getRawFiles = function() {
  return this.rawFiles;
};

TemplateWriter.prototype.getWatchedIgnores = function() {
  return this.addIgnores(this.inputDir, []).map(ignore =>
    TemplatePath.stripLeadingDotSlash(ignore.substr(1))
  );
};

TemplateWriter.prototype.getFiles = function() {
  return this.files;
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

TemplateWriter.prototype.addIgnores = function(inputDir, files) {
  files = files.concat(
    TemplateWriter.getFileIgnores(".gitignore", "node_modules/")
  );

  files = files.concat(
    TemplateWriter.getFileIgnores(inputDir + "/.eleventyignore")
  );

  files = files.concat(TemplateGlob.map("!" + this.outputDir + "/**"));

  return files;
};

TemplateWriter.prototype.addWritingIgnores = function(inputDir, files) {
  if (this.config.dir.includes) {
    files = files.concat(TemplateGlob.map("!" + this.includesDir + "/**"));
  }

  if (this.config.dir.data && this.config.dir.data !== ".") {
    files = files.concat(TemplateGlob.map("!" + this.dataDir + "/**"));
  }

  return files;
};

TemplateWriter.prototype._getAllPaths = async function() {
  // Note the gitignore: true option for globby is _really slow_
  return globby(this.files); //, { gitignore: true });
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

TemplateWriter.prototype._copyPassthroughPath = async function(path) {
  let pass = new TemplatePassthrough(path, this.outputDir, this.inputDir);
  pass.setDryRun(this.isDryRun);

  try {
    await pass.write();
    debugDev("Copied %o", path);
  } catch (e) {
    throw EleventyError.make(new Error(`Having trouble copying: ${path}`), e);
  }
};

TemplateWriter.prototype._copyPassthroughs = async function(paths) {
  if (!this.config.passthroughFileCopy) {
    debug("`passthroughFileCopy` is disabled in config, bypassing.");
    return;
  }

  let count = 0;

  debug("TemplatePassthrough copy started.");
  for (let cfgPath in this.config.passthroughCopies) {
    count++;
    this._copyPassthroughPath(cfgPath);
  }

  for (let path of paths) {
    if (!TemplateRender.hasEngine(path)) {
      count++;
      this._copyPassthroughPath(path);
    }
  }

  this.copyCount += count;
  debug(`TemplatePassthrough copied ${count} item${count !== 1 ? "s" : ""}.`);
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
  debug("Searching for: %O", this.files);
  let paths = await this._getAllPaths();
  debug("Found: %o", paths);

  await this._copyPassthroughs(paths);
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
};

TemplateWriter.prototype.getCopyCount = function() {
  return this.copyCount;
};

TemplateWriter.prototype.getWriteCount = function() {
  return this.writeCount;
};

module.exports = TemplateWriter;
