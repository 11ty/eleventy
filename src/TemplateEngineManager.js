import EleventyBaseError from "./EleventyBaseError.js";
class TemplateEngineManagerConfigError extends EleventyBaseError {}

export default class TemplateEngineManager {
  constructor(config) {
    if (!config) {
      throw new TemplateEngineManagerConfigError("Missing `config` argument.");
    }
    this.config = config;

    this.engineCache = {};
  }

  get keyToClassNameMap() {
    if (!this._keyToClassNameMap) {
      this._keyToClassNameMap = {
        ejs: "Ejs",
        md: "Markdown",
        html: "Html",
        hbs: "Handlebars",
        mustache: "Mustache",
        haml: "Haml",
        pug: "Pug",
        njk: "Nunjucks",
        liquid: "Liquid",
        "11ty.js": "JavaScript",
      };

      if ("extensionMap" in this.config) {
        for (let entry of this.config.extensionMap) {
          this._keyToClassNameMap[entry.key] = "Custom";
        }
      }
    }
    return this._keyToClassNameMap;
  }

  reset() {
    this.engineCache = {};
  }

  getClassNameFromTemplateKey(key) {
    let keys = this.keyToClassNameMap;

    return keys[key];
  }

  hasEngine(name) {
    return !!this.getClassNameFromTemplateKey(name);
  }

  async getEngineClassByExtension(extension) {
    // We include these as raw strings (and not more readable variables) so they’re parsed by the bundler.
    if (extension === "ejs") {
      return import("./Engines/Ejs.js").then((x) => x.default);
    } else if (extension === "md") {
      return import("./Engines/Markdown.js").then((x) => x.default);
    } else if (extension === "html") {
      return import("./Engines/Html.js").then((x) => x.default);
    } else if (extension === "hbs") {
      return import("./Engines/Handlebars.js").then((x) => x.default);
    } else if (extension === "mustache") {
      return import("./Engines/Mustache.js").then((x) => x.default);
    } else if (extension === "haml") {
      return import("./Engines/Haml.js").then((x) => x.default);
    } else if (extension === "pug") {
      return import("./Engines/Pug.js").then((x) => x.default);
    } else if (extension === "njk") {
      return import("./Engines/Nunjucks.js").then((x) => x.default);
    } else if (extension === "liquid") {
      return import("./Engines/Liquid.js").then((x) => x.default);
    } else if (extension === "11ty.js") {
      return import("./Engines/JavaScript.js").then((x) => x.default);
    } else {
      return import("./Engines/Custom.js").then((x) => x.default);
    }
  }

  async getEngine(name, dirs, extensionMap) {
    if (!this.hasEngine(name)) {
      throw new Error(
        `Template Engine ${name} does not exist in getEngine (dirs: ${dirs})`
      );
    }

    if (this.engineCache[name]) {
      return this.engineCache[name];
    }

    let cls = await this.getEngineClassByExtension(name);

    let instance = await cls.from(name, dirs, this.config);
    instance.extensionMap = extensionMap;
    instance.engineManager = this;

    // If the user providers a "Custom" engine using addExtension,
    // But that engine's instance is *not* custom,
    // The user must be overriding an existing engine
    // i.e. addExtension('md', { ...overrideBehavior })
    if (
      this.getClassNameFromTemplateKey(name) === "Custom" &&
      instance.constructor.name !== "CustomEngine"
    ) {
      const CustomEngine = await this.getEngineClassByExtension();
      const overrideCustomEngine = new CustomEngine(name, dirs, this.config);
      // Keep track of the "default" engine 11ty would normally use
      // This allows the user to access the default engine in their override
      overrideCustomEngine.setDefaultEngine(instance);
      instance = overrideCustomEngine;
    }

    // Make sure cache key is based on name and not path
    // Custom class is used for all plugins, cache once per plugin
    this.engineCache[name] = instance;
    return instance;
  }
}
