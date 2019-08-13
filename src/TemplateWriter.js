const Template = require("./Template");
const TemplatePath = require("./TemplatePath");
const TemplateMap = require("./TemplateMap");
const TemplateRender = require("./TemplateRender");
const EleventyFiles = require("./EleventyFiles");
const EleventyBaseError = require("./EleventyBaseError");
const EleventyErrorHandler = require("./EleventyErrorHandler");
const EleventyErrorUtil = require("./EleventyErrorUtil");

const config = require("./Config");
const debug = require("debug")("Eleventy:TemplateWriter");
const debugDev = require("debug")("Dev:Eleventy:TemplateWriter");

class TemplateWriterWriteError extends EleventyBaseError {}

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

  // TODO can we get rid of this? It’s only used for tests in getFileManager()
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
  if (!this.eleventyFiles) {
    // if not, we can create one (used only by tests)
    this.eleventyFiles = new EleventyFiles(
      this.input,
      this.outputDir,
      this.templateFormats,
      this.passthroughAll
    );
    this.eleventyFiles.init();
  }

  return this.eleventyFiles;
};

TemplateWriter.prototype._getAllPaths = async function() {
  return await this.getFileManager().getFiles();
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
  for (let transformName in this.config.filters) {
    let transform = this.config.filters[transformName];
    if (typeof transform === "function") {
      tmpl.addTransform(transform);
    }
  }

  for (let linterName in this.config.linters) {
    let linter = this.config.linters[linterName];
    if (typeof linter === "function") {
      tmpl.addLinter(linter);
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
  // we don’t re-use the map templateContent because it doesn’t include layouts
  return tmpl.writeMapEntry(mapEntry).then(() => {
    this.writeCount += tmpl.getWriteCount();
  });
};

TemplateWriter.prototype.write = async function() {
  let promises = [];
  let paths = await this._getAllPaths();
  debug("Found: %o", paths);
  promises.push(
    this.getFileManager()
      .getPassthroughManager()
      .copyAll(paths)
      .catch(e => {
        EleventyErrorHandler.warn(e, "Error with passthrough copy");
        return Promise.reject(
          new TemplateWriterWriteError(`Having trouble copying`, e)
        );
      })
  );

  // TODO optimize await here
  await this._createTemplateMap(paths);
  debug("Template map created.");

  let mapEntry;
  let usedTemplateContentTooEarlyMap = [];
  for (mapEntry of this.templateMap.getMap()) {
    promises.push(
      this._writeTemplate(mapEntry).catch(function(e) {
        // Premature templateContent in layout render, this also happens in
        // TemplateMap.populateContentDataInMap for non-layout content
        if (EleventyErrorUtil.isPrematureTemplateContentError(e)) {
          usedTemplateContentTooEarlyMap.push(mapEntry);
        } else {
          return Promise.reject(
            new TemplateWriterWriteError(
              `Having trouble writing template: ${mapEntry.outputPath}`,
              e
            )
          );
        }
      })
    );
  }

  for (mapEntry of usedTemplateContentTooEarlyMap) {
    promises.push(
      this._writeTemplate(mapEntry).catch(function(e) {
        return Promise.reject(
          new TemplateWriterWriteError(
            `Having trouble writing template (second pass): ${mapEntry.outputPath}`,
            e
          )
        );
      })
    );
  }

  return Promise.all(promises).catch(e => {
    EleventyErrorHandler.error(e, "Error writing templates");
    throw e;
  });
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
