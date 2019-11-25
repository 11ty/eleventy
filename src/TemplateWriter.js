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

class TemplateWriter {
  constructor(
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
    this.skippedCount = 0;

    // TODO can we get rid of this? It’s only used for tests in getFileManager()
    this.passthroughAll = isPassthroughAll;
  }

  /* For testing */
  overrideConfig(config) {
    this.config = config;
  }

  restart() {
    this.writeCount = 0;
    this.skippedCount = 0;
    debugDev("Resetting counts to 0");
  }

  setEleventyFiles(eleventyFiles) {
    this.eleventyFiles = eleventyFiles;
  }

  getFileManager() {
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
  }

  async _getAllPaths() {
    return await this.getFileManager().getFiles();
  }

  _createTemplate(path) {
    let tmpl = new Template(
      path,
      this.inputDir,
      this.outputDir,
      this.templateData
    );

    tmpl.setIsVerbose(this.isVerbose);

    // --incremental only writes files that trigger a build during --watch
    if (this.incrementalFile && path !== this.incrementalFile) {
      tmpl.setDryRun(true);
    } else {
      tmpl.setDryRun(this.isDryRun);
    }

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
  }

  async _addToTemplateMap(paths) {
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
  }

  async _createTemplateMap(paths) {
    this.templateMap = new TemplateMap();

    await this._addToTemplateMap(paths);
    await this.templateMap.cache();

    debugDev("TemplateMap cache complete.");
    return this.templateMap;
  }

  async _writeTemplate(mapEntry) {
    let tmpl = mapEntry.template;
    // we don’t re-use the map templateContent because it doesn’t include layouts
    return tmpl.writeMapEntry(mapEntry).then(() => {
      this.skippedCount += tmpl.getSkippedCount();
      this.writeCount += tmpl.getWriteCount();
    });
  }

  async write() {
    let promises = [];
    let paths = await this._getAllPaths();
    debug("Found: %o", paths);

    let passthroughManager = this.getFileManager().getPassthroughManager();
    passthroughManager.setIncrementalFile(
      this.incrementalFile ? this.incrementalFile : false
    );

    promises.push(
      passthroughManager.copyAll(paths).catch(e => {
        EleventyErrorHandler.warn(e, "Error with passthrough copy");
        return Promise.reject(
          new TemplateWriterWriteError("Having trouble copying", e)
        );
      })
    );

    // TODO optimize await here
    await this._createTemplateMap(paths);
    debug("Template map created.");

    let usedTemplateContentTooEarlyMap = [];
    for (let mapEntry of this.templateMap.getMap()) {
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

    for (let mapEntry of usedTemplateContentTooEarlyMap) {
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
  }

  setVerboseOutput(isVerbose) {
    this.isVerbose = isVerbose;
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;

    this.getFileManager()
      .getPassthroughManager()
      .setDryRun(this.isDryRun);
  }

  setIncrementalFile(incrementalFile) {
    this.incrementalFile = incrementalFile;
  }
  resetIncrementalFile() {
    this.incrementalFile = null;
  }

  getCopyCount() {
    return this.getFileManager()
      .getPassthroughManager()
      .getCopyCount();
  }

  getSkippedCopyCount() {
    return this.getFileManager()
      .getPassthroughManager()
      .getSkippedCount();
  }

  getWriteCount() {
    return this.writeCount;
  }

  getSkippedCount() {
    return this.skippedCount;
  }
}

module.exports = TemplateWriter;
