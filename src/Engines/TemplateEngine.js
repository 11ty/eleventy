const fs = require("fs");
const { TemplatePath } = require("@11ty/eleventy-utils");

const TemplateConfig = require("../TemplateConfig");
const EleventyExtensionMap = require("../EleventyExtensionMap");
const EleventyBaseError = require("../EleventyBaseError");
const debug = require("debug")("Eleventy:TemplateEngine");

class TemplateEngineConfigError extends EleventyBaseError {}

class TemplateEngine {
  constructor(name, dirs, config) {
    this.name = name;

    if (!dirs) {
      dirs = {};
    }

    this.dirs = dirs;
    this.inputDir = dirs.input;
    this.includesDir = dirs.includes;

    this.partialsHaveBeenCached = false;
    this.partials = [];
    this.engineLib = null;
    this.cacheable = false;

    if (!config) {
      throw new TemplateEngineConfigError("Missing `config` argument.");
    }
    this._config = config;
  }

  set config(cfg) {
    this._config = cfg;
  }

  get config() {
    if (this._config instanceof TemplateConfig) {
      return this._config.getConfig();
    }
    return this._config;
  }

  get benchmarks() {
    if (!this._benchmarks) {
      this._benchmarks = {
        aggregate: this.config.benchmarkManager.get("Aggregate"),
      };
    }
    return this._benchmarks;
  }

  get engineManager() {
    return this._engineManager;
  }

  set engineManager(manager) {
    this._engineManager = manager;
  }

  get extensionMap() {
    if (!this._extensionMap) {
      this._extensionMap = new EleventyExtensionMap([], this.config);
    }
    return this._extensionMap;
  }

  set extensionMap(map) {
    this._extensionMap = map;
  }

  get extensions() {
    if (!this._extensions) {
      this._extensions = this.extensionMap.getExtensionsFromKey(this.name);
    }
    return this._extensions;
  }

  get extensionEntries() {
    if (!this._extensionEntries) {
      this._extensionEntries = this.extensionMap.getExtensionEntriesFromKey(
        this.name
      );
    }
    return this._extensionEntries;
  }

  getName() {
    return this.name;
  }

  getIncludesDir() {
    return this.includesDir;
  }

  async getPartials() {
    if (!this.partialsHaveBeenCached) {
      this.partials = await this.cachePartialFiles();
    }

    return this.partials;
  }

  /**
   * Search for and cache partial files.
   *
   * This only runs if getPartials() is called, which is only for Mustache/Handlebars.
   *
   * @protected
   */
  async cachePartialFiles() {
    // Try to skip this require if not used (for bundling reasons)
    const fastglob = require("fast-glob");

    this.partialsHaveBeenCached = true;
    let partials = {};
    let prefix = this.includesDir + "/**/*.";
    // TODO: reuse mustache partials in handlebars?
    let partialFiles = [];
    if (this.includesDir) {
      let bench = this.benchmarks.aggregate.get("Searching the file system");
      bench.before();
      await Promise.all(
        this.extensions.map(async function (extension) {
          partialFiles = partialFiles.concat(
            await fastglob(prefix + extension, {
              caseSensitiveMatch: false,
              dot: true,
            })
          );
        })
      );
      bench.after();
    }

    partialFiles = TemplatePath.addLeadingDotSlashArray(partialFiles);

    await Promise.all(
      partialFiles.map(async (partialFile) => {
        let partialPath = TemplatePath.stripLeadingSubPath(
          partialFile,
          this.includesDir
        );
        let partialPathNoExt = partialPath;
        this.extensions.forEach(function (extension) {
          partialPathNoExt = TemplatePath.removeExtension(
            partialPathNoExt,
            "." + extension
          );
        });

        partials[partialPathNoExt] = await fs.promises.readFile(partialFile, {
          encoding: "utf8",
        });
      })
    );

    debug(
      `${this.includesDir}/*.{${this.extensions}} found partials for: %o`,
      Object.keys(partials)
    );

    return partials;
  }

  /**
   * @protected
   */
  setEngineLib(engineLib) {
    this.engineLib = engineLib;

    // Run engine amendments (via issue #2438)
    for (let amendment of this.config.libraryAmendments[this.name] || []) {
      // TODO it’d be nice if this were async friendly
      amendment(engineLib);
    }
  }

  getEngineLib() {
    return this.engineLib;
  }

  async _testRender(str, data) {
    /* TODO compile needs to pass in inputPath? */
    try {
      let fn = await this.compile(str);
      return fn(data);
    } catch (e) {
      throw e;
    }
  }

  // JavaScript files defer to the module loader rather than read the files to strings
  needsToReadFileContents() {
    return true;
  }

  getExtraDataFromFile() {
    return {};
  }

  initRequireCache() {
    // do nothing
  }

  getCompileCacheKey(str, inputPath) {
    // Changing to use inputPath and contents, this created weird bugs when two identical files had different file paths
    // TODO update docs
    return inputPath + str;
  }

  get defaultTemplateFileExtension() {
    return "html";
  }

  permalinkNeedsCompilation(str) {
    return this.needsCompilation(str);
  }

  // whether or not compile is needed or can we return the plaintext?
  needsCompilation(str) {
    return true;
  }

  /**
   * Make sure compile is implemented downstream.
   * @abstract
   * @return {Promise}
   */
  async compile() {
    throw new Error("compile() must be implemented by engine");
  }

  // See https://www.11ty.dev/docs/watch-serve/#watch-javascript-dependencies
  static shouldSpiderJavaScriptDependencies() {
    return false;
  }
}

module.exports = TemplateEngine;
