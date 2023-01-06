const os = require("os");
const fs = require("graceful-fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const normalize = require("normalize-path");
const matter = require("gray-matter");
const lodashSet = require("lodash.set");
const { TemplatePath } = require("@11ty/eleventy-utils");

const EleventyExtensionMap = require("./EleventyExtensionMap");
const TemplateData = require("./TemplateData");
const TemplateRender = require("./TemplateRender");
const TemplateConfig = require("./TemplateConfig");
const EleventyBaseError = require("./EleventyBaseError");
const EleventyErrorUtil = require("./EleventyErrorUtil");
const debug = require("debug")("Eleventy:TemplateContent");
const debugDev = require("debug")("Dev:Eleventy:TemplateContent");
const eventBus = require("./EventBus");

class TemplateContentConfigError extends EleventyBaseError {}
class TemplateContentFrontMatterError extends EleventyBaseError {}
class TemplateContentCompileError extends EleventyBaseError {}
class TemplateContentRenderError extends EleventyBaseError {}

class TemplateContent {
  constructor(inputPath, inputDir, config) {
    if (!config) {
      throw new TemplateContentConfigError("Missing `config` argument to TemplateContent");
    }
    this.config = config;

    this.inputPath = inputPath;

    if (inputDir) {
      this.inputDir = normalize(inputDir);
    } else {
      this.inputDir = false;
    }
  }

  getResetTypes(types) {
    if (types) {
      return Object.assign(
        {
          data: false,
          read: false,
          render: false,
        },
        types
      );
    }

    return {
      data: true,
      read: true,
      render: true,
    };
  }

  // Called during an incremental build when the template instance is cached but needs to be reset because it has changed
  resetCaches(types) {
    types = this.getResetTypes(types);

    if (types.read) {
      delete this.readingPromise;
      delete this.inputContent;
      delete this.frontMatter;
      delete this._frontMatterDataCache;
    }
  }

  /* Used by tests */
  get extensionMap() {
    if (!this._extensionMap) {
      this._extensionMap = new EleventyExtensionMap([], this.config);
    }
    return this._extensionMap;
  }

  set extensionMap(map) {
    this._extensionMap = map;
  }

  set config(config) {
    this._config = config;
  }

  get config() {
    if (this._config instanceof TemplateConfig) {
      return this._config.getConfig();
    }
    return this._config;
  }

  get bench() {
    return this.config.benchmarkManager.get("Aggregate");
  }

  get eleventyConfig() {
    if (this._config instanceof TemplateConfig) {
      return this._config;
    }
    throw new TemplateContentConfigError("Tried to get an eleventyConfig but none was found.");
  }

  get engine() {
    return this.templateRender.engine;
  }

  get templateRender() {
    if (!this._templateRender) {
      this._templateRender = new TemplateRender(this.inputPath, this.inputDir, this.config);
      this._templateRender.extensionMap = this.extensionMap;
    }

    return this._templateRender;
  }

  // For monkey patchers
  get frontMatter() {
    if (this.frontMatterOverride) {
      return this.frontMatterOverride;
    } else if (this._frontMatter) {
      return this._frontMatter;
    } else {
      throw new Error(
        "Unfortunately you’re using code that monkey patched some Eleventy internals and it isn’t async-friendly."
      );
    }
  }

  // For monkey patchers
  set frontMatter(contentOverride) {
    this.frontMatterOverride = contentOverride;
  }

  getInputPath() {
    return this.inputPath;
  }

  getInputDir() {
    return this.inputDir;
  }

  async read() {
    if (!this.readingPromise) {
      if (!this.inputContent) {
        // cache the promise
        this.inputContent = this.getInputContent();
      }

      this.readingPromise = new Promise(async (resolve, reject) => {
        try {
          let content = await this.inputContent;

          if (content) {
            let options = this.config.frontMatterParsingOptions || {};
            let fm;
            try {
              fm = matter(content, options);
            } catch (e) {
              throw new TemplateContentFrontMatterError(
                `Having trouble reading front matter from template ${this.inputPath}`,
                e
              );
            }

            if (options.excerpt && fm.excerpt) {
              let excerptString = fm.excerpt + (options.excerpt_separator || "---");
              if (fm.content.startsWith(excerptString + os.EOL)) {
                // with an os-specific newline after excerpt separator
                fm.content =
                  fm.excerpt.trim() + "\n" + fm.content.slice((excerptString + os.EOL).length);
              } else if (fm.content.startsWith(excerptString + "\n")) {
                // with a newline (\n) after excerpt separator
                // This is necessary for some git configurations on windows
                fm.content =
                  fm.excerpt.trim() + "\n" + fm.content.slice((excerptString + 1).length);
              } else if (fm.content.startsWith(excerptString)) {
                // no newline after excerpt separator
                fm.content = fm.excerpt + fm.content.slice(excerptString.length);
              }

              // alias, defaults to page.excerpt
              let alias = options.excerpt_alias || "page.excerpt";
              lodashSet(fm.data, alias, fm.excerpt);
            }

            // For monkey patchers that used `frontMatter` 🤧
            // https://github.com/11ty/eleventy/issues/613#issuecomment-999637109
            // https://github.com/11ty/eleventy/issues/2710#issuecomment-1373854834
            this._frontMatter = fm;

            resolve(fm);
          } else {
            resolve({
              data: {},
              content: "",
              excerpt: "",
            });
          }
        } catch (e) {
          reject(e);
        }
      });
    }

    return this.readingPromise;
  }

  static cache(path, content) {
    this._inputCache.set(TemplatePath.absolutePath(path), content);
  }

  static getCached(path) {
    return this._inputCache.get(TemplatePath.absolutePath(path));
  }

  static deleteFromInputCache(path) {
    this._inputCache.delete(TemplatePath.absolutePath(path));
  }

  // Used via clone
  setInputContent(content) {
    this.inputContent = content;
  }

  async getInputContent() {
    if (!this.engine.needsToReadFileContents()) {
      return "";
    }

    let templateBenchmark = this.bench.get("Template Read");
    templateBenchmark.before();

    let content;

    if (this.config.useTemplateCache) {
      content = TemplateContent.getCached(this.inputPath);
    }

    if (!content) {
      content = await readFile(this.inputPath, "utf8");

      if (this.config.useTemplateCache) {
        TemplateContent.cache(this.inputPath, content);
      }
    }

    templateBenchmark.after();

    return content;
  }

  // This might only be used in tests
  async getFrontMatter() {
    let fm = this.frontMatterOverride ? this.frontMatterOverride : await this.read();
    return fm;
  }

  async getPreRender() {
    let fm = this.frontMatterOverride ? this.frontMatterOverride : await this.read();

    return fm.content;
  }

  async getFrontMatterData() {
    if (!this._frontMatterDataCache) {
      this._frontMatterDataCache = new Promise(async (resolve, reject) => {
        try {
          let fm = await this.read();

          let extraData = await this.engine.getExtraDataFromFile(this.inputPath);
          let data = TemplateData.mergeDeep({}, fm.data, extraData);

          let cleanedData = TemplateData.cleanupData(data);
          resolve(cleanedData);
        } catch (e) {
          reject(e);
        }
      });
    }

    return this._frontMatterDataCache;
  }

  async getEngineOverride() {
    let frontMatterData = await this.getFrontMatterData();
    return frontMatterData[this.config.keys.engineOverride];
  }

  async setupTemplateRender(engineOverride, bypassMarkdown) {
    if (engineOverride !== undefined) {
      debugDev("%o overriding template engine to use %o", this.inputPath, engineOverride);

      this.templateRender.setEngineOverride(engineOverride, bypassMarkdown);
    } else {
      this.templateRender.setUseMarkdown(!bypassMarkdown);
    }
  }

  _getCompileCache(str) {
    // Caches used to be bifurcated based on engine name, now they’re based on inputPath
    let inputPathMap = TemplateContent._compileCache.get(this.inputPath);
    if (!inputPathMap) {
      inputPathMap = new Map();
      TemplateContent._compileCache.set(this.inputPath, inputPathMap);
    }

    let cacheable = this.engine.cacheable;
    let { useCache, key } = this.engine.getCompileCacheKey(str, this.inputPath);
    return [cacheable, key, inputPathMap, useCache];
  }

  async compile(str, bypassMarkdown, engineOverride) {
    await this.setupTemplateRender(engineOverride, bypassMarkdown);

    if (bypassMarkdown && !this.engine.needsCompilation(str)) {
      return async function () {
        return str;
      };
    }

    debugDev("%o compile() using engine: %o", this.inputPath, this.templateRender.engineName);

    try {
      let res;
      if (this.config.useTemplateCache) {
        let [cacheable, key, cache, useCache] = this._getCompileCache(str);
        if (cacheable && key) {
          if (useCache && cache.has(key)) {
            this.bench.get("(count) Template Compile Cache Hit").incrementCount();
            return cache.get(key);
          }

          this.bench.get("(count) Template Compile Cache Miss").incrementCount();

          // Compile cache is cleared when the resource is modified (below)

          // Compilation is async, so we eagerly cache a Promise that eventually
          // resolves to the compiled function
          cache.set(
            key,
            new Promise((resolve) => {
              res = resolve;
            })
          );
        }
      }

      let templateBenchmark = this.bench.get("Template Compile");
      let inputPathBenchmark = this.bench.get(`> Compile > ${this.inputPath}`);
      templateBenchmark.before();
      inputPathBenchmark.before();
      let fn = await this.templateRender.getCompiledTemplate(str);
      inputPathBenchmark.after();
      templateBenchmark.after();
      debugDev("%o getCompiledTemplate function created", this.inputPath);
      if (this.config.useTemplateCache && res) {
        res(fn);
      }
      return fn;
    } catch (e) {
      let [cacheable, key, cache] = this._getCompileCache(str);
      if (cacheable && key) {
        cache.delete(key);
      }
      debug(`Having trouble compiling template ${this.inputPath}: %O`, str);
      throw new TemplateContentCompileError(
        `Having trouble compiling template ${this.inputPath}`,
        e
      );
    }
  }

  getParseForSymbolsFunction(str) {
    let engine = this.engine;

    // Don’t use markdown as the engine to parse for symbols
    let preprocessorEngine = this.templateRender.getPreprocessorEngine(); // TODO pass in engineOverride here
    if (preprocessorEngine && engine.getName() !== preprocessorEngine) {
      let replacementEngine = this.templateRender.getEngineByName(preprocessorEngine);
      if (replacementEngine) {
        engine = replacementEngine;
      }
    }

    if ("parseForSymbols" in engine) {
      return () => {
        return engine.parseForSymbols(str);
      };
    }
  }

  // used by computed data or for permalink functions
  async _renderFunction(fn, ...args) {
    let mixins = Object.assign({}, this.config.javascriptFunctions);
    let result = await fn.call(mixins, ...args);

    // normalize Buffer away if returned from permalink
    if (Buffer.isBuffer(result)) {
      return result.toString();
    }

    return result;
  }

  async renderComputedData(str, data) {
    if (typeof str === "function") {
      return this._renderFunction(str, data);
    }

    return this._render(str, data, true);
  }

  async renderPermalink(permalink, data) {
    this.bench.get("(count) Render Permalink").incrementCount();
    this.bench
      .get(`(count) > Render Permalink > ${this.inputPath}${this._getPaginationLogSuffix(data)}`)
      .incrementCount();

    let permalinkCompilation = this.engine.permalinkNeedsCompilation(permalink);

    // No string compilation:
    //    ({ compileOptions: { permalink: "raw" }})
    // These mean `permalink: false`, which is no file system writing:
    //    ({ compileOptions: { permalink: false }})
    //    ({ compileOptions: { permalink: () => false }})
    //    ({ compileOptions: { permalink: () => (() = > false) }})
    if (permalinkCompilation === false) {
      return permalink;
    }

    /* Custom `compile` function for permalinks, usage:
    permalink: function(permalinkString, inputPath) {
      return async function(data) {
        return "THIS IS MY RENDERED PERMALINK";
      }
    }
    */
    if (permalinkCompilation && typeof permalinkCompilation === "function") {
      permalink = await this._renderFunction(permalinkCompilation, permalink, this.inputPath);
    }

    // Raw permalink function (in the app code data cascade)
    if (typeof permalink === "function") {
      return this._renderFunction(permalink, data);
    }

    return this._render(permalink, data, true);
  }

  async render(str, data, bypassMarkdown) {
    return this._render(str, data, bypassMarkdown);
  }

  _getPaginationLogSuffix(data) {
    let suffix = [];
    if ("pagination" in data) {
      suffix.push(" (");
      if (data.pagination.pages) {
        suffix.push(
          `${data.pagination.pages.length} page${data.pagination.pages.length !== 1 ? "s" : ""}`
        );
      } else {
        suffix.push("Pagination");
      }
      suffix.push(")");
    }
    return suffix.join("");
  }

  async _render(str, data, bypassMarkdown) {
    try {
      if (bypassMarkdown && !this.engine.needsCompilation(str)) {
        return str;
      }

      let fn = await this.compile(str, bypassMarkdown, data[this.config.keys.engineOverride]);

      if (fn === undefined) {
        return;
      } else if (typeof fn !== "function") {
        throw new Error(`The \`compile\` function did not return a function. Received ${fn}`);
      }

      // Benchmark
      let templateBenchmark = this.bench.get("Render");
      // Skip benchmark for each individual pagination entry (very busy output)
      let logRenderToOutputBenchmark = "pagination" in data;
      let inputPathBenchmark = this.bench.get(
        `> Render > ${this.inputPath}${this._getPaginationLogSuffix(data)}`
      );
      let outputPathBenchmark;
      if (data.page && data.page.outputPath && logRenderToOutputBenchmark) {
        outputPathBenchmark = this.bench.get(`> Render to > ${data.page.outputPath}`);
      }

      templateBenchmark.before();
      if (inputPathBenchmark) {
        inputPathBenchmark.before();
      }
      if (outputPathBenchmark) {
        outputPathBenchmark.before();
      }

      let rendered = await fn(data);

      if (outputPathBenchmark) {
        outputPathBenchmark.after();
      }
      if (inputPathBenchmark) {
        inputPathBenchmark.after();
      }
      templateBenchmark.after();
      debugDev("%o getCompiledTemplate called, rendered content created", this.inputPath);
      return rendered;
    } catch (e) {
      if (EleventyErrorUtil.isPrematureTemplateContentError(e)) {
        throw e;
      } else {
        let engine = this.templateRender.getReadableEnginesList();
        debug(`Having trouble rendering ${engine} template ${this.inputPath}: %O`, str);
        throw new TemplateContentRenderError(
          `Having trouble rendering ${engine} template ${this.inputPath}`,
          e
        );
      }
    }
  }

  getExtensionEntries() {
    return this.engine.extensionEntries;
  }

  isFileRelevantToThisTemplate(incrementalFile, metadata = {}) {
    // always relevant if incremental file not set (build everything)
    if (!incrementalFile) {
      return true;
    }

    let hasDependencies = this.engine.hasDependencies(incrementalFile);

    let isRelevant = this.engine.isFileRelevantTo(this.inputPath, incrementalFile);

    debug(
      "Test dependencies to see if %o is relevant to %o: %o",
      this.inputPath,
      incrementalFile,
      isRelevant
    );

    let extensionEntries = this.getExtensionEntries().filter((entry) => !!entry.isIncrementalMatch);
    if (extensionEntries.length) {
      for (let entry of extensionEntries) {
        if (
          entry.isIncrementalMatch.call(
            {
              inputPath: this.inputPath,
              isFullTemplate: metadata.isFullTemplate,
              isFileRelevantToInputPath: isRelevant,
              doesFileHaveDependencies: hasDependencies,
            },
            incrementalFile
          )
        ) {
          return true;
        }
      }

      return false;
    } else {
      // Not great way of building all templates if this is a layout, include, JS dependency.
      // TODO improve this for default template syntaxes

      // This is the fallback way of determining if something is incremental (no isIncrementalMatch available)
      // This will be true if the inputPath and incrementalFile are the same
      if (isRelevant) {
        return true;
      }

      // only return true here if dependencies are not known
      if (!hasDependencies && !metadata.isFullTemplate) {
        return true;
      }
    }

    return false;
  }
}

TemplateContent._inputCache = new Map();
TemplateContent._compileCache = new Map();
eventBus.on("eleventy.resourceModified", (path) => {
  // delete from input cache
  TemplateContent.deleteFromInputCache(path);

  // delete from compile cache
  let normalized = TemplatePath.addLeadingDotSlash(path);
  let compileCache = TemplateContent._compileCache.get(normalized);
  if (compileCache) {
    compileCache.clear();
  }
});

// Used when the configuration file reset https://github.com/11ty/eleventy/issues/2147
eventBus.on("eleventy.compileCacheReset", (path) => {
  TemplateContent._compileCache = new Map();
});

module.exports = TemplateContent;
