const fastglob = require("fast-glob");

const Template = require("./Template");
const TemplatePath = require("./TemplatePath");
const TemplateMap = require("./TemplateMap");
const TemplateRender = require("./TemplateRender");
const EleventyFiles = require("./EleventyFiles");
const EleventyError = require("./EleventyError");

const config = require("./Config");
const debug = require("debug")("Eleventy:TemplateWriter");
const debugDev = require("debug")("Dev:Eleventy:TemplateWriter");

function TemplateWriter(
  inputPath,
  outputDir,
  templateFormats, // TODO remove this, see `.getFileManager()` first
  templateData,
  isPassthroughAll
) {
  this.config = config.getConfig();
  this.input = inputPath;
  this.inputDir = TemplatePath.getDir(inputPath);
  this.outputDir = outputDir;
  this.templateFormats = templateFormats;
  this.templateData = templateData;
  this.isVerbose = true;
  this.isDryRun = false;
  this.writeCount = 0;
  this.passthroughAll = isPassthroughAll;
}

/* For testing */
TemplateWriter.prototype.overrideConfig = function(config) {
  this.config = config;
};

TemplateWriter.prototype.restart = function() {
  this.writeCount = 0;
  debugDev("Resetting counts to 0");
};

TemplateWriter.prototype.setEleventyFiles = function(eleventyFiles) {
  this.eleventyFiles = eleventyFiles;
};

TemplateWriter.prototype.getFileManager = function() {
  // usually Eleventy.js will setEleventyFiles with the EleventyFiles manager
  // if not, we can create one (used only by tests)
  if (!this.eleventyFiles) {
    this.eleventyFiles = new EleventyFiles(
      this.input,
      this.outputDir,
      this.templateFormats
    );
  }

  return this.eleventyFiles;
};

TemplateWriter.prototype._getAllPaths = async function() {
  let files = this.getFileManager().getFiles();

  debug("Searching for: %o", files);
  return TemplatePath.addLeadingDotSlashArray(await fastglob.async(files));
};

TemplateWriter.prototype._createTemplate = function(path) {
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

TemplateWriter.prototype._addToTemplateMap = async function(paths) {
  let promises = [];
  for (let path of paths) {
    if (TemplateRender.hasEngine(path)) {
      promises.push(
        this.templateMap.add(this._createTemplate(path)).then(() => {
          debug(`${path} added to map.`);
        })
      );
    }
  }

  return Promise.all(promises);
};

TemplateWriter.prototype._createTemplateMap = async function(paths) {
  this.templateMap = new TemplateMap();

  await this._addToTemplateMap(paths);
  await this.templateMap.cache();

  debugDev("TemplateMap cache complete.");
  return this.templateMap;
};

TemplateWriter.prototype._writeTemplate = async function(mapEntry) {
  let tmpl = mapEntry.template;
  try {
    return tmpl.write(mapEntry.outputPath, mapEntry.data).then(() => {
      this.writeCount += tmpl.getWriteCount();
    });
  } catch (e) {
    throw EleventyError.make(
      new Error(`Having trouble writing template: ${mapEntry.outputPath}`),
      e
    );
  }
};

TemplateWriter.prototype.write = async function() {
  let promises = [];
  let paths = await this._getAllPaths();
  debug("Found: %o", paths);

  promises.push(
    this.getFileManager()
      .getPassthroughManager()
      .copyAll(paths)
  );

  // TODO optimize await here
  await this._createTemplateMap(paths);
  debug("Template map created.");

  for (let mapEntry of this.templateMap.getMap()) {
    promises.push(this._writeTemplate(mapEntry));
  }
  return Promise.all(promises);
};

TemplateWriter.prototype.setVerboseOutput = function(isVerbose) {
  this.isVerbose = isVerbose;
};

TemplateWriter.prototype.setDryRun = function(isDryRun) {
  this.isDryRun = !!isDryRun;

  this.getFileManager()
    .getPassthroughManager()
    .setDryRun(this.isDryRun);
};

TemplateWriter.prototype.getCopyCount = function() {
  return this.getFileManager()
    .getPassthroughManager()
    .getCopyCount();
};

TemplateWriter.prototype.getWriteCount = function() {
  return this.writeCount;
};

module.exports = TemplateWriter;
