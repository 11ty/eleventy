const EleventyBaseError = require("./EleventyBaseError");
class TemplateEngineManagerConfigError extends EleventyBaseError {}

class TemplateEngineManager {
  constructor(config) {
    if (!config) {
      throw new TemplateEngineManagerConfigError("Missing `config` argument.");
    }
    this.config = config;

    this.engineCache = {};
  }

  static isCustomEngineSimpleAlias(entry) {
    let keys = Object.keys(entry);
    if (keys.length > 2) {
      return false;
    }
    return !keys.some((key) => {
      return key !== "key" && key !== "extension";
    });
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

      // Custom entries *can* overwrite default entries above
      if ("extensionMap" in this.config) {
        for (let entry of this.config.extensionMap) {
          // either the key does not already exist or it is not a simple alias and is an override: https://www.11ty.dev/docs/languages/custom/#overriding-an-existing-template-language
          if (
            !this._keyToClassNameMap[entry.key] ||
            !TemplateEngineManager.isCustomEngineSimpleAlias(entry)
          ) {
            // throw an error if you try to override a Custom engine, this is a short term error until we swap this to use the extension instead of the key to get the class
            if (this._keyToClassNameMap[entry.key] === "Custom") {
              throw new Error(
                `An attempt was made to override the *already* overridden "${entry.key}" template syntax via the \`addExtension\` configuration API. A maximum of one override is currently supported. If you’re trying to add an alias to an existing syntax, make sure only the \`key\` property is present in the addExtension options object.`
              );
            }

            this._keyToClassNameMap[entry.key] = "Custom";
          }
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

  getEngineClassByExtension(extension) {
    // We include these as raw strings (and not more readable variables) so they’re parsed by the bundler.
    if (extension === "ejs") {
      return require("./Engines/Ejs");
    } else if (extension === "md") {
      return require("./Engines/Markdown");
    } else if (extension === "html") {
      return require("./Engines/Html");
    } else if (extension === "hbs") {
      return require("./Engines/Handlebars");
    } else if (extension === "mustache") {
      return require("./Engines/Mustache");
    } else if (extension === "haml") {
      return require("./Engines/Haml");
    } else if (extension === "pug") {
      return require("./Engines/Pug");
    } else if (extension === "njk") {
      return require("./Engines/Nunjucks");
    } else if (extension === "liquid") {
      return require("./Engines/Liquid");
    } else if (extension === "11ty.js") {
      return require("./Engines/JavaScript");
    } else {
      return require("./Engines/Custom");
    }
  }

  getEngine(name, dirs, extensionMap) {
    if (!this.hasEngine(name)) {
      throw new Error(
        `Template Engine ${name} does not exist in getEngine (dirs: ${dirs})`
      );
    }

    // TODO these cached engines should be based on extensions not name, then we can remove the error in
    //  "Double override (not aliases) throws an error" test in TemplateRenderCustomTest.js
    if (this.engineCache[name]) {
      return this.engineCache[name];
    }

    let cls = this.getEngineClassByExtension(name);

    let instance = new cls(name, dirs, this.config);
    instance.extensionMap = extensionMap;
    instance.engineManager = this;

    // If provided a "Custom" engine using addExtension,
    // But that engine's instance is *not* custom,
    // The user must be overriding an existing engine
    // i.e. addExtension('md', { ...overrideBehavior })
    if (
      this.getClassNameFromTemplateKey(name) === "Custom" &&
      instance.constructor.name !== "CustomEngine"
    ) {
      const CustomEngine = this.getEngineClassByExtension();
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

module.exports = TemplateEngineManager;
