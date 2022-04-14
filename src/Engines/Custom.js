const TemplateEngine = require("./TemplateEngine");
const getJavaScriptData = require("../Util/GetJavaScriptData");

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

  needsToReadFileContents() {
    if ("read" in this.entry) {
      return this.entry.read;
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
    if (!("getData" in this.entry) || this.entry.getData === false) {
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
      defaultRenderer, // bind defaultRenderer to compile function
    })(str, inputPath);

    // Support `undefined` to skip compile/render
    if (fn) {
      // Bind defaultRenderer to render function
      if ("then" in fn && typeof fn.then === "function") {
        // Promise, wait to bind
        return fn.then((fn) => fn.bind({ defaultRenderer }));
      } else if ("bind" in fn && typeof fn.bind === "function") {
        return fn.bind({ defaultRenderer });
      }
    }

    return fn;
  }

  get defaultTemplateFileExtension() {
    return this.entry.outputFileExtension;
  }

  getCompileCacheKey(str, inputPath) {
    if (
      this.entry.compileOptions &&
      "getCacheKey" in this.entry.compileOptions
    ) {
      if (typeof this.entry.compileOptions.getCacheKey !== "function") {
        throw new Error(
          `\`compileOptions.getCacheKey\` must be a function in addExtension for the ${this.name} type`
        );
      }

      return this.entry.compileOptions.getCacheKey(str, inputPath);
    }
    return super.getCompileCacheKey(str, inputPath);
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
