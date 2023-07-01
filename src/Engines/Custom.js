const TemplateEngine = require("./TemplateEngine");
const getJavaScriptData = require("../Util/GetJavaScriptData");
const eventBus = require("../EventBus.js");

let lastModifiedFile = undefined;
eventBus.on("eleventy.resourceModified", (path) => {
  lastModifiedFile = path;
});

class CustomEngine extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);

    this.entry = this.getExtensionMapEntry();
    this.needsInit =
      "init" in this.entry && typeof this.entry.init === "function";

    this._defaultEngine = undefined;

    // Enable cacheability for this template
    if (this.entry.compileOptions && "cache" in this.entry.compileOptions) {
      this.cacheable = this.entry.compileOptions.cache;
    } else if (this.needsToReadFileContents()) {
      this.cacheable = true;
    }
  }

  getExtensionMapEntry() {
    if ("extensionMap" in this.config) {
      // Iterates over only the user config `addExtension` entries
      for (let entry of this.config.extensionMap) {
        if (entry.key.toLowerCase() === this.name.toLowerCase()) {
          return entry;
        }
      }
    }

    throw Error(
      `Could not find a custom extension for ${this.name}. Did you add it to your config file?`
    );
  }

  setDefaultEngine(defaultEngine) {
    this._defaultEngine = defaultEngine;
  }

  /**
   * @override
   */
  needsToReadFileContents() {
    if ("read" in this.entry) {
      return this.entry.read;
    }

    // Handle aliases to `11ty.js` templates, avoid reading files in the alias, see #2279
    // Here, we are short circuiting fallback to defaultRenderer, does not account for compile
    // functions that call defaultRenderer explicitly
    if (
      this._defaultEngine &&
      "needsToReadFileContents" in this._defaultEngine
    ) {
      return this._defaultEngine.needsToReadFileContents();
    }

    return true;
  }

  // If we init from multiple places, wait for the first init to finish before continuing on.
  async _runningInit() {
    if (this.needsInit) {
      if (!this._initing) {
        this._initBench = this.benchmarks.aggregate.get(
          `Engine (${this.name}) Init`
        );
        this._initBench.before();
        this._initing = this.entry.init.bind({
          config: this.config,
          bench: this.benchmarks.aggregate,
        })();
      }
      await this._initing;
      this.needsInit = false;

      if (this._initBench) {
        this._initBench.after();
        this._initBench = undefined;
      }
    }
  }

  async getExtraDataFromFile(inputPath) {
    if (this.entry.getData === false) {
      return;
    }

    if (!("getData" in this.entry)) {
      // Handle aliases to `11ty.js` templates, use upstream default engine data fetch, see #2279
      if (
        this._defaultEngine &&
        "getExtraDataFromFile" in this._defaultEngine
      ) {
        return this._defaultEngine.getExtraDataFromFile(inputPath);
      }

      return;
    }

    await this._runningInit();

    if (typeof this.entry.getData === "function") {
      let dataBench = this.benchmarks.aggregate.get(
        `Engine (${this.name}) Get Data From File (Function)`
      );
      dataBench.before();
      let data = this.entry.getData(inputPath);
      dataBench.after();
      return data;
    }

    // if getData is not false or a function then `getInstanceFromInputPath` must exist
    if (!("getInstanceFromInputPath" in this.entry)) {
      return Promise.reject(
        new Error(
          `getInstanceFromInputPath callback missing from ${this.name} template engine plugin.`
        )
      );
    }

    let keys = new Set();
    if (this.entry.getData === true) {
      keys.add("data");
    } else if (Array.isArray(this.entry.getData)) {
      for (let key of this.entry.getData) {
        keys.add(key);
      }
    }

    let dataBench = this.benchmarks.aggregate.get(
      `Engine (${this.name}) Get Data From File`
    );
    dataBench.before();

    let inst = await this.entry.getInstanceFromInputPath(inputPath);
    // override keys set at the plugin level in the individual template
    if (inst.eleventyDataKey) {
      keys = new Set(inst.eleventyDataKey);
    }

    let mixins;
    if (this.config) {
      // Object.assign usage: see TemplateRenderCustomTest.js: `JavaScript functions should not be mutable but not *that* mutable`
      mixins = Object.assign({}, this.config.javascriptFunctions);
    }

    let promises = [];
    for (let key of keys) {
      promises.push(
        getJavaScriptData(inst, inputPath, key, {
          mixins,
          isObjectRequired: key === "data",
        })
      );
    }

    let results = await Promise.all(promises);
    let data = {};
    for (let result of results) {
      Object.assign(data, result);
    }
    dataBench.after();

    return data;
  }

  async compile(str, inputPath, ...args) {
    await this._runningInit();
    let defaultRenderer;
    if (this._defaultEngine) {
      defaultRenderer = async (data) => {
        const render = await this._defaultEngine.compile(
          str,
          inputPath,
          ...args
        );
        return render(data);
      };
    }

    // Fall back to default compiler if the user does not provide their own
    if (!this.entry.compile && defaultRenderer) {
      return defaultRenderer;
    }

    // TODO generalize this (look at JavaScript.js)
    let fn = this.entry.compile.bind({
      config: this.config,
      addDependencies: (from, toArray = []) => {
        this.config.uses.addDependency(from, toArray);
      },
      defaultRenderer, // bind defaultRenderer to compile function
    })(str, inputPath);

    // Support `undefined` to skip compile/render
    if (fn) {
      // Bind defaultRenderer to render function
      if ("then" in fn && typeof fn.then === "function") {
        // Promise, wait to bind
        return fn.then((fn) => {
          if (typeof fn === "function") {
            return fn.bind({ defaultRenderer });
          }
          return fn;
        });
      } else if ("bind" in fn && typeof fn.bind === "function") {
        return fn.bind({ defaultRenderer });
      }
    }

    return fn;
  }

  get defaultTemplateFileExtension() {
    return this.entry.outputFileExtension;
  }

  hasDependencies(inputPath) {
    if (this.config.uses.getDependencies(inputPath) === false) {
      return false;
    }
    return true;
  }

  isFileRelevantTo(inputPath, comparisonFile, includeLayouts) {
    return this.config.uses.isFileRelevantTo(
      inputPath,
      comparisonFile,
      includeLayouts
    );
  }

  getCompileCacheKey(str, inputPath) {
    // Return this separately so we know whether or not to use the cached version
    // but still return a key to cache this new render for next time
    let useCache = !this.isFileRelevantTo(inputPath, lastModifiedFile, false);

    if (
      this.entry.compileOptions &&
      "getCacheKey" in this.entry.compileOptions
    ) {
      if (typeof this.entry.compileOptions.getCacheKey !== "function") {
        throw new Error(
          `\`compileOptions.getCacheKey\` must be a function in addExtension for the ${this.name} type`
        );
      }

      return {
        useCache,
        key: this.entry.compileOptions.getCacheKey(str, inputPath),
      };
    }

    let { key } = super.getCompileCacheKey(str, inputPath);
    return {
      useCache,
      key,
    };
  }

  permalinkNeedsCompilation(str) {
    if (this.entry.compileOptions && "permalink" in this.entry.compileOptions) {
      let p = this.entry.compileOptions.permalink;
      if (p === "raw") {
        return false;
      }

      // permalink: false is aliased to permalink: () => false
      if (p === false) {
        return () => false;
      }

      return this.entry.compileOptions.permalink;
    }

    return true;
  }

  static shouldSpiderJavaScriptDependencies(entry) {
    if (
      entry.compileOptions &&
      "spiderJavaScriptDependencies" in entry.compileOptions
    ) {
      return entry.compileOptions.spiderJavaScriptDependencies;
    }

    return false;
  }
}

module.exports = CustomEngine;
