const os = require("os");
const fs = require("graceful-fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const normalize = require("normalize-path");
const matter = require("gray-matter");
const lodashSet = require("lodash/set");

const EleventyExtensionMap = require("./EleventyExtensionMap");
const TemplateData = require("./TemplateData");
const TemplateRender = require("./TemplateRender");
const TemplatePath = require("./TemplatePath");
const TemplateConfig = require("./TemplateConfig");
const EleventyBaseError = require("./EleventyBaseError");
const EleventyErrorUtil = require("./EleventyErrorUtil");
const debug = require("debug")("Eleventy:TemplateContent");
const debugDev = require("debug")("Dev:Eleventy:TemplateContent");
const bench = require("./BenchmarkManager").get("Aggregate");
const eventBus = require("./EventBus");

class TemplateContentConfigError extends EleventyBaseError {}
class TemplateContentFrontMatterError extends EleventyBaseError {}
class TemplateContentCompileError extends EleventyBaseError {}
class TemplateContentRenderError extends EleventyBaseError {}

class TemplateContent {
  constructor(inputPath, inputDir, config) {
    if (!config) {
      throw new TemplateContentConfigError(
        "Missing `config` argument to TemplateContent"
      );
    }
    this.config = config;

    this.inputPath = inputPath;

    if (inputDir) {
      this.inputDir = normalize(inputDir);
    } else {
      this.inputDir = false;
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

  get eleventyConfig() {
    if (this._config instanceof TemplateConfig) {
      return this._config;
    }
    throw new TemplateContentConfigError(
      "Tried to get an eleventyConfig but none was found."
    );
  }

  get engine() {
    return this.templateRender.engine;
  }

  get templateRender() {
    if (!this._templateRender) {
      this._templateRender = new TemplateRender(
        this.inputPath,
        this.inputDir,
        this.config
      );
      this._templateRender.extensionMap = this.extensionMap;
    }

    return this._templateRender;
  }

  getInputPath() {
    return this.inputPath;
  }

  getInputDir() {
    return this.inputDir;
  }

  async read() {
    if (this.inputContent) {
      await this.inputContent;
    } else {
      this.inputContent = await this.getInputContent();
    }

    if (this.inputContent) {
      let options = this.config.frontMatterParsingOptions || {};
      let fm;
      try {
        fm = matter(this.inputContent, options);
      } catch (e) {
        throw new TemplateContentFrontMatterError(
          `Having trouble reading front matter from template ${this.inputPath}`,
          e
        );
      }
      if (options.excerpt && fm.excerpt) {
        let excerptString = fm.excerpt + (options.excerpt_separator || "---");
        if (fm.content.startsWith(excerptString + os.EOL)) {
          // with a newline after excerpt separator
          fm.content =
            fm.excerpt.trim() +
            "\n" +
            fm.content.substr((excerptString + os.EOL).length);
        } else if (fm.content.startsWith(excerptString)) {
          // no newline after excerpt separator
          fm.content = fm.excerpt + fm.content.substr(excerptString.length);
        }

        // alias, defaults to page.excerpt
        let alias = options.excerpt_alias || "page.excerpt";
        lodashSet(fm.data, alias, fm.excerpt);
      }
      this.frontMatter = fm;
    } else {
      this.frontMatter = {
        data: {},
        content: "",
        excerpt: "",
      };
    }
  }

  static cache(path, content) {
    this._inputCache.set(TemplatePath.absolutePath(path), content);
  }

  static getCached(path) {
    return this._inputCache.get(TemplatePath.absolutePath(path));
  }

  static deleteCached(path) {
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
    let templateBenchmark = bench.get("Template Read");
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

  async getFrontMatter() {
    if (!this.frontMatter) {
      await this.read();
    }

    return this.frontMatter;
  }

  async getPreRender() {
    if (!this.frontMatter) {
      await this.read();
    }

    return this.frontMatter.content;
  }

  async getFrontMatterData() {
    if (this._frontMatterDataCache) {
      return this._frontMatterDataCache;
    }

    if (!this.frontMatter) {
      await this.read();
    }
    let extraData = await this.engine.getExtraDataFromFile(this.inputPath);
    let data = TemplateData.mergeDeep({}, this.frontMatter.data, extraData);
    let cleanedData = TemplateData.cleanupData(data);
    this._frontMatterDataCache = cleanedData;
    return cleanedData;
  }

  async getEngineOverride() {
    let frontMatterData = await this.getFrontMatterData();
    return frontMatterData[this.config.keys.engineOverride];
  }

  async setupTemplateRender(bypassMarkdown) {
    let engineOverride = await this.getEngineOverride();
    if (engineOverride !== undefined) {
      debugDev(
        "%o overriding template engine to use %o",
        this.inputPath,
        engineOverride
      );

      this.templateRender.setEngineOverride(engineOverride, bypassMarkdown);
    } else {
      this.templateRender.setUseMarkdown(!bypassMarkdown);
    }
  }

  _getCompileCache(str, bypassMarkdown) {
    let engineName = this.engine.getName() + "::" + !!bypassMarkdown;
    let engineMap = TemplateContent._compileEngineCache.get(engineName);
    if (!engineMap) {
      engineMap = new Map();
      TemplateContent._compileEngineCache.set(engineName, engineMap);
    }

    let cacheable = this.engine.cacheable;
    let key = this.engine.getCompileCacheKey(str, this.inputPath);

    return [cacheable, key, engineMap];
  }

  async compile(str, bypassMarkdown) {
    await this.setupTemplateRender(bypassMarkdown);

    if (bypassMarkdown && !this.engine.needsCompilation(str)) {
      return async function () {
        return str;
      };
    }

    debugDev(
      "%o compile() using engine: %o",
      this.inputPath,
      this.templateRender.engineName
    );

    try {
      let res;
      if (this.config.useTemplateCache) {
        let [cacheable, key, cache] = this._getCompileCache(
          str,
          bypassMarkdown
        );
        if (cacheable && key) {
          if (cache.has(key)) {
            return cache.get(key);
          }

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

      let templateBenchmark = bench.get("Template Compile");
      let inputPathBenchmark = bench.get(
        `> Template Compile > ${this.inputPath}`
      );
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
      let [cacheable, key, cache] = this._getCompileCache(str, bypassMarkdown);
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
    if ("parseForSymbols" in this.engine) {
      return () => {
        return this.engine.parseForSymbols(str);
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

    /* Usage:
    permalink: function(permalinkString, inputPath) {
      return async function(data) {
        return "THIS IS MY RENDERED PERMALINK";
      }
    }
    */
    if (permalinkCompilation && typeof permalinkCompilation === "function") {
      permalink = await this._renderFunction(
        permalinkCompilation,
        permalink,
        this.inputPath
      );
    }

    if (typeof permalink === "function") {
      return this._renderFunction(permalink, data);
    }

    return this._render(permalink, data, true);
  }

  async render(str, data, bypassMarkdown) {
    return this._render(str, data, bypassMarkdown);
  }

  async _render(str, data, bypassMarkdown) {
    try {
      if (bypassMarkdown && !this.engine.needsCompilation(str)) {
        return str;
      }

      let fn = await this.compile(str, bypassMarkdown);
      if (fn === undefined) {
        return;
      } else if (typeof fn !== "function") {
        throw new Error(
          `The \`compile\` function did not return a function. Received ${fn}`
        );
      }

      // Benchmark
      let templateBenchmark = bench.get("Render");
      let paginationSuffix = [];
      if ("pagination" in data) {
        paginationSuffix.push(" (Pagination");
        if (data.pagination.pages) {
          paginationSuffix.push(
            `: ${data.pagination.pages.length} page${
              data.pagination.pages.length !== 1 ? "s" : ""
            }`
          );
        }
        paginationSuffix.push(")");
      }

      let inputPathBenchmark = bench.get(
        `> Render > ${this.inputPath}${paginationSuffix.join("")}`
      );

      templateBenchmark.before();
      if (inputPathBenchmark) {
        inputPathBenchmark.before();
      }

      let rendered = await fn(data);

      if (inputPathBenchmark) {
        inputPathBenchmark.after();
      }
      templateBenchmark.after();
      debugDev(
        "%o getCompiledTemplate called, rendered content created",
        this.inputPath
      );
      return rendered;
    } catch (e) {
      if (EleventyErrorUtil.isPrematureTemplateContentError(e)) {
        throw e;
      } else {
        let engine = this.templateRender.getReadableEnginesList();
        debug(
          `Having trouble rendering ${engine} template ${this.inputPath}: %O`,
          str
        );
        throw new TemplateContentRenderError(
          `Having trouble rendering ${engine} template ${this.inputPath}`,
          e
        );
      }
    }
  }

  getExtensionEntries() {
    let extensions = this.templateRender.engine.extensionEntries;
    return extensions;
  }

  isFileRelevantToThisTemplate(incrementalFile, metadata = {}) {
    // always relevant if incremental file not set (build everything)
    if (!incrementalFile) {
      return true;
    }

    let extensionEntries = this.getExtensionEntries().filter(
      (entry) => !!entry.isIncrementalMatch
    );
    if (extensionEntries.length) {
      for (let entry of extensionEntries) {
        if (
          entry.isIncrementalMatch.call(
            {
              inputPath: this.inputPath,
            },
            incrementalFile
          )
        ) {
          return true;
        }
      }

      return false;
    } else {
      // This is the fallback way of determining if something is incremental (no isIncrementalMatch available)

      // Not great way of building all templates if this is a layout, include, JS dependency.
      // TODO improve this for default langs
      if (!metadata.isFullTemplate) {
        return true;
      }

      // only build if this input path is the same as the file that was changed
      if (this.inputPath === incrementalFile) {
        return true;
      }
    }

    return false;
  }
}

TemplateContent._inputCache = new Map();
TemplateContent._compileEngineCache = new Map();
eventBus.on("eleventy.resourceModified", (path) => {
  TemplateContent.deleteCached(path);
});

module.exports = TemplateContent;
