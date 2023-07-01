const { TemplatePath } = require("@11ty/eleventy-utils");

const Template = require("./Template");
const TemplateMap = require("./TemplateMap");
const EleventyFiles = require("./EleventyFiles");
const EleventyExtensionMap = require("./EleventyExtensionMap");
const EleventyBaseError = require("./EleventyBaseError");
const EleventyErrorHandler = require("./EleventyErrorHandler");
const EleventyErrorUtil = require("./EleventyErrorUtil");
const FileSystemSearch = require("./FileSystemSearch");
const ConsoleLogger = require("./Util/ConsoleLogger");

const debug = require("debug")("Eleventy:TemplateWriter");
const debugDev = require("debug")("Dev:Eleventy:TemplateWriter");

class TemplateWriterMissingConfigArgError extends EleventyBaseError {}
class EleventyPassthroughCopyError extends EleventyBaseError {}
class EleventyTemplateError extends EleventyBaseError {}

class TemplateWriter {
  constructor(
    inputPath,
    outputDir,
    templateFormats, // TODO remove this, see `get eleventyFiles` first
    templateData,
    eleventyConfig
  ) {
    if (!eleventyConfig) {
      throw new TemplateWriterMissingConfigArgError("Missing config argument.");
    }
    this.eleventyConfig = eleventyConfig;
    this.config = eleventyConfig.getConfig();
    this.userConfig = eleventyConfig.userConfig;

    this.input = inputPath;
    this.inputDir = TemplatePath.getDir(inputPath);
    this.outputDir = outputDir;

    this.templateFormats = templateFormats;

    this.templateData = templateData;
    this.isVerbose = true;
    this.isDryRun = false;
    this.writeCount = 0;
    this.skippedCount = 0;
    this.isRunInitialBuild = true;

    this._templatePathCache = new Map();
  }

  /* Overrides this.input and this.inputDir
   * Useful when input is a file and inputDir is not its direct parent */
  setInput(inputDir, input) {
    this.inputDir = inputDir;
    this.input = input;
  }

  get templateFormats() {
    return this._templateFormats;
  }

  set templateFormats(value) {
    this._templateFormats = value;
  }

  /* Getter for error handler */
  get errorHandler() {
    if (!this._errorHandler) {
      this._errorHandler = new EleventyErrorHandler();
      this._errorHandler.isVerbose = this.verboseMode;
      this._errorHandler.logger = this.logger;
    }

    return this._errorHandler;
  }

  /* Getter for Logger */
  get logger() {
    if (!this._logger) {
      this._logger = new ConsoleLogger();
      this._logger.isVerbose = this.verboseMode;
    }

    return this._logger;
  }

  /* Setter for Logger */
  set logger(logger) {
    this._logger = logger;
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

  set extensionMap(extensionMap) {
    this._extensionMap = extensionMap;
  }

  get extensionMap() {
    if (!this._extensionMap) {
      this._extensionMap = new EleventyExtensionMap(this.templateFormats, this.eleventyConfig);
    }
    return this._extensionMap;
  }

  setEleventyFiles(eleventyFiles) {
    this.eleventyFiles = eleventyFiles;
  }

  set eleventyFiles(eleventyFiles) {
    this._eleventyFiles = eleventyFiles;
  }

  get eleventyFiles() {
    // usually Eleventy.js will setEleventyFiles with the EleventyFiles manager
    if (!this._eleventyFiles) {
      // if not, we can create one (used only by tests)
      this._eleventyFiles = new EleventyFiles(
        this.inputDir,
        this.outputDir,
        this.templateFormats,
        this.eleventyConfig
      );

      this._eleventyFiles.setInput(this.inputDir, this.input);
      this._eleventyFiles.setFileSystemSearch(new FileSystemSearch());
      this._eleventyFiles.init();
    }

    return this._eleventyFiles;
  }

  async _getAllPaths() {
    // this is now cached upstream by FileSystemSearch
    return this.eleventyFiles.getFiles();
  }

  _isIncrementalFileAPassthroughCopy(paths) {
    if (!this.incrementalFile) {
      return false;
    }

    let passthroughManager = this.eleventyFiles.getPassthroughManager();
    return passthroughManager.isPassthroughCopyFile(paths, this.incrementalFile);
  }

  _createTemplate(path, to = "fs") {
    let tmpl = this._templatePathCache.get(path);

    let wasCached = false;
    if (tmpl) {
      wasCached = true;
      // TODO reset other constructor things here like inputDir/outputDir/extensionMap/
      tmpl.setTemplateData(this.templateData);
    } else {
      tmpl = new Template(
        path,
        this.inputDir,
        this.outputDir,
        this.templateData,
        this.extensionMap,
        this.eleventyConfig
      );

      tmpl.setOutputFormat(to);

      tmpl.logger = this.logger;
      this._templatePathCache.set(path, tmpl);

      /*
       * Sample filter: arg str, return pretty HTML string
       * function(str) {
       *   return pretty(str, { ocd: true });
       * }
       */
      for (let transformName in this.config.transforms) {
        let transform = this.config.transforms[transformName];
        if (typeof transform === "function") {
          tmpl.addTransform(transformName, transform);
        }
      }

      for (let linterName in this.config.linters) {
        let linter = this.config.linters[linterName];
        if (typeof linter === "function") {
          tmpl.addLinter(linter);
        }
      }
    }

    tmpl.setDryRun(this.isDryRun);
    tmpl.setIsVerbose(this.isVerbose);
    tmpl.reset();

    return {
      template: tmpl,
      wasCached,
    };
  }

  async _addToTemplateMap(paths, to = "fs") {
    let promises = [];

    let isIncrementalFileAFullTemplate = this.eleventyFiles.isFullTemplateFile(
      paths,
      this.incrementalFile
    );
    let isIncrementalFileAPassthroughCopy = this._isIncrementalFileAPassthroughCopy(paths);

    let relevantToDeletions = new Set();

    // Update the data cascade and the global dependency map for the one incremental template before everything else (only full templates)
    if (isIncrementalFileAFullTemplate && this.incrementalFile) {
      let path = this.incrementalFile;
      let { template: tmpl, wasCached } = this._createTemplate(path, to);
      if (wasCached) {
        tmpl.resetCaches(); // reset internal caches on the cached template instance
      }

      // Render overrides are only used when `--ignore-initial` is in play and an initial build is not run
      if (!this.isRunInitialBuild) {
        tmpl.setRenderableOverride(undefined); // reset to render enabled
      }

      let p = this.templateMap.add(tmpl);
      promises.push(p);
      await p;
      debug(`${path} adding to template map.`);

      // establish new relationships for this template
      relevantToDeletions = this.templateMap.setupDependencyGraphChangesForIncrementalFile(
        tmpl.inputPath
      );

      this.templateMap.addToGlobalDependencyGraph();
    }

    for (let path of paths) {
      if (!this.extensionMap.hasEngine(path)) {
        continue;
      }

      if (isIncrementalFileAPassthroughCopy) {
        this.skippedCount++;
        continue;
      }

      // We already updated the data cascade for this template above
      if (isIncrementalFileAFullTemplate && this.incrementalFile === path) {
        continue;
      }

      let { template: tmpl, wasCached } = this._createTemplate(path, to);

      if (!this.incrementalFile) {
        // Render overrides are only used when `--ignore-initial` is in play and an initial build is not run
        if (!this.isRunInitialBuild) {
          if (wasCached) {
            tmpl.setRenderableOverride(undefined); // enable render
          } else {
            tmpl.setRenderableOverride(false); // disable render
          }
        }

        if (wasCached) {
          tmpl.resetCaches();
        }
      } else {
        let isTemplateRelevantToDeletedCollections = relevantToDeletions.has(
          TemplatePath.stripLeadingDotSlash(tmpl.inputPath)
        );

        if (
          isTemplateRelevantToDeletedCollections ||
          tmpl.isFileRelevantToThisTemplate(this.incrementalFile, {
            isFullTemplate: isIncrementalFileAFullTemplate,
          })
        ) {
          // Related to the template but not the template (reset the render cache, not the read cache)
          tmpl.resetCaches({
            data: true,
            render: true,
          });

          // Render overrides are only used when `--ignore-initial` is in play and an initial build is not run
          if (!this.isRunInitialBuild) {
            tmpl.setRenderableOverride(undefined); // reset to render enabled
          }
        } else {
          // During incremental we only reset the data cache for non-matching templates, see https://github.com/11ty/eleventy/issues/2710
          // Keep caches for read/render
          tmpl.resetCaches({
            data: true,
          });

          // Render overrides are only used when `--ignore-initial` is in play and an initial build is not run
          if (!this.isRunInitialBuild) {
            tmpl.setRenderableOverride(false); // false to disable render
          }

          tmpl.setDryRunViaIncremental();
          this.skippedCount++;
        }
      }

      // This fetches the data cascade for this template, which we want to avoid if not applicable to incremental
      promises.push(this.templateMap.add(tmpl));
      debug(`${path} adding to template map.`);
    }

    return Promise.all(promises);
  }

  async _createTemplateMap(paths, to) {
    this.templateMap = new TemplateMap(this.eleventyConfig);

    await this._addToTemplateMap(paths, to);

    // write new template relationships to the global dependency graph for next time
    this.templateMap.addToGlobalDependencyGraph();

    await this.templateMap.cache();

    debugDev("TemplateMap cache complete.");
    return this.templateMap;
  }

  async _generateTemplate(mapEntry, to) {
    let tmpl = mapEntry.template;

    return tmpl.generateMapEntry(mapEntry, to).then((pages) => {
      this.writeCount += tmpl.getWriteCount();
      return pages;
    });
  }

  async writePassthroughCopy(templateExtensionPaths) {
    let passthroughManager = this.eleventyFiles.getPassthroughManager();
    passthroughManager.setIncrementalFile(this.incrementalFile);

    return passthroughManager.copyAll(templateExtensionPaths).catch((e) => {
      this.errorHandler.warn(e, "Error with passthrough copy");
      return Promise.reject(new EleventyPassthroughCopyError("Having trouble copying", e));
    });
  }

  async generateTemplates(paths, to = "fs") {
    let promises = [];

    // console.time("generateTemplates:_createTemplateMap");
    // TODO optimize await here
    await this._createTemplateMap(paths, to);
    // console.timeEnd("generateTemplates:_createTemplateMap");
    debug("Template map created.");

    let usedTemplateContentTooEarlyMap = [];
    for (let mapEntry of this.templateMap.getMap()) {
      promises.push(
        this._generateTemplate(mapEntry, to).catch(function (e) {
          // Premature templateContent in layout render, this also happens in
          // TemplateMap.populateContentDataInMap for non-layout content
          if (EleventyErrorUtil.isPrematureTemplateContentError(e)) {
            usedTemplateContentTooEarlyMap.push(mapEntry);
          } else {
            return Promise.reject(
              new EleventyTemplateError(
                `Having trouble writing to "${mapEntry.outputPath}" from "${mapEntry.inputPath}"`,
                e
              )
            );
          }
        })
      );
    }

    for (let mapEntry of usedTemplateContentTooEarlyMap) {
      promises.push(
        this._generateTemplate(mapEntry, to).catch(function (e) {
          return Promise.reject(
            new EleventyTemplateError(
              `Having trouble writing to (second pass) "${mapEntry.outputPath}" from "${mapEntry.inputPath}"`,
              e
            )
          );
        })
      );
    }

    return promises;
  }

  async write() {
    let paths = await this._getAllPaths();
    let promises = [];

    // The ordering here is important to destructuring in Eleventy->_watch
    promises.push(this.writePassthroughCopy(paths));

    promises.push(...(await this.generateTemplates(paths)));

    return Promise.all(promises).catch((e) => {
      return Promise.reject(e);
    });
  }

  // Passthrough copy not supported in JSON output.
  // --incremental not supported in JSON output.
  async getJSON(to = "json") {
    let paths = await this._getAllPaths();
    let promises = await this.generateTemplates(paths, to);

    return Promise.all(promises)
      .then((results) => {
        let flat = results.flat();
        return flat;
      })
      .catch((e) => {
        this.errorHandler.error(e, "Error generating templates");
        throw e;
      });
  }

  setVerboseOutput(isVerbose) {
    this.isVerbose = isVerbose;
    this.errorHandler.isVerbose = isVerbose;
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;

    this.eleventyFiles.getPassthroughManager().setDryRun(this.isDryRun);
  }

  setRunInitialBuild(runInitialBuild) {
    this.isRunInitialBuild = runInitialBuild;
  }
  setIncrementalBuild(isIncremental) {
    this.isIncremental = isIncremental;
  }
  setIncrementalFile(incrementalFile) {
    this.incrementalFile = incrementalFile;
  }
  resetIncrementalFile() {
    this.incrementalFile = null;
  }

  getCopyCount() {
    return this.eleventyFiles.getPassthroughManager().getCopyCount();
  }

  getWriteCount() {
    return this.writeCount;
  }

  getSkippedCount() {
    return this.skippedCount;
  }

  get caches() {
    return ["_templatePathCache"];
  }
}

module.exports = TemplateWriter;
