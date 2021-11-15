const TemplateEngine = require("./TemplateEngine");
const getJavaScriptData = require("../Util/GetJavaScriptData");

class CustomEngine extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);

    this.entry = this.getExtensionMapEntry();
    this.needsInit =
      "init" in this.entry && typeof this.entry.init === "function";
    this.initStarted = false;
    this.initFinished = false;

    this._defaultEngine = undefined;
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

  // If we init from multiple places, wait for the first init to finish
  // before continuing on.
  async _runningInit() {
    if (this.needsInit) {
      if (this.initStarted) {
        await this.initStarted;
      } else if (!this.initFinished) {
        this.initStarted = this.entry.init.bind({ config: this.config })();
        await this.initStarted;
        this.initFinished = true;
      }
    }
  }

  async getExtraDataFromFile(inputPath) {
    await this._runningInit();

    if ("getData" in this.entry) {
      if (typeof this.entry.getData === "function") {
        return this.entry.getData(inputPath);
      } else {
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
        if (keys.size === 0) {
          return Promise.reject(
            new Error(
              `getData must be an array of keys or \`true\` in your addExtension configuration.`
            )
          );
        }

        let inst = await this.entry.getInstanceFromInputPath(inputPath);
        let mixins;
        if (this.config) {
          mixins = this.config.javascriptFunctions;
        }

        // override keys set at the plugin level in the individual template
        if (inst.eleventyDataKey) {
          keys = new Set(inst.eleventyDataKey);
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

        return data;
      }
    }
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
        return await render(data);
      };
    }

    // Fall back to default compiler if the user does not provide their own
    if (!this.entry.compile && defaultRenderer) {
      return defaultRenderer;
    }

    // TODO generalize this (look at JavaScript.js)
    return (
      this.entry.compile
        .bind({ config: this.config })(str, inputPath)
        // give the user access to this engine's default renderer, if any
        .bind({ defaultRenderer })
    );
  }

  get defaultTemplateFileExtension() {
    return this.entry.outputFileExtension;
  }
}

module.exports = CustomEngine;
