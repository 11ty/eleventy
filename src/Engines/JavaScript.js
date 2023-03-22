const { TemplatePath } = require("@11ty/eleventy-utils");

const TemplateEngine = require("./TemplateEngine");
const EleventyBaseError = require("../EleventyBaseError");
const getJavaScriptData = require("../Util/GetJavaScriptData");
const EventBusUtil = require("../Util/EventBusUtil");

class JavaScriptTemplateNotDefined extends EleventyBaseError {}

class JavaScript extends TemplateEngine {
  // which data keys to bind to `this` in JavaScript template functions
  // static DATA_KEYS_TO_BIND = ["page", "eleventy"];
  static DATA_KEYS_TO_BIND = ["page", "eleventy"];

  constructor(name, dirs, config) {
    super(name, dirs, config);
    this.instances = {};

    this.cacheable = false;

    EventBusUtil.soloOn("eleventy.resourceModified", (inputPath, usedByDependants = []) => {
      // Remove from cached instances when modified
      let instancesToDelete = [TemplatePath.addLeadingDotSlash(inputPath), ...usedByDependants];
      for (let inputPath of instancesToDelete) {
        if (inputPath in this.instances) {
          delete this.instances[inputPath];
        }
      }
    });
  }

  normalize(result) {
    if (Buffer.isBuffer(result)) {
      return result.toString();
    }

    return result;
  }

  // String, Buffer, Promise
  // Function, Class
  // Object
  _getInstance(mod) {
    let noop = function () {
      return "";
    };

    if (typeof mod === "string" || mod instanceof Buffer || mod.then) {
      return { render: () => mod };
    } else if (typeof mod === "function") {
      if (mod.prototype && ("data" in mod.prototype || "render" in mod.prototype)) {
        if (!("render" in mod.prototype)) {
          mod.prototype.render = noop;
        }
        return new mod();
      } else {
        return {
          render: mod,
        };
      }
    } else if ("data" in mod || "render" in mod) {
      if (!("render" in mod)) {
        mod.render = noop;
      }
      return mod;
    }
  }

  getInstanceFromInputPath(inputPath) {
    if (this.instances[inputPath]) {
      return this.instances[inputPath];
    }

    const mod = require(TemplatePath.absolutePath(inputPath));
    let inst = this._getInstance(mod);
    if (inst) {
      this.instances[inputPath] = inst;
    } else {
      throw new JavaScriptTemplateNotDefined(
        `No JavaScript template returned from ${inputPath} (did you assign to module.exports?)`
      );
    }
    return inst;
  }

  /**
   * JavaScript files defer to the module loader rather than read the files to strings
   *
   * @override
   */
  needsToReadFileContents() {
    return false;
  }

  async getExtraDataFromFile(inputPath) {
    let inst = this.getInstanceFromInputPath(inputPath);
    return getJavaScriptData(inst, inputPath);
  }

  getJavaScriptFunctions(inst) {
    let fns = {};
    let configFns = this.config.javascriptFunctions;

    for (let key in configFns) {
      // prefer pre-existing `page` javascriptFunction, if one exists
      if (key === "page") {
        // do nothing
      } else {
        // note: wrapping creates a new function
        fns[key] = JavaScript.wrapJavaScriptFunction(inst, configFns[key]);
      }
    }
    return fns;
  }

  static wrapJavaScriptFunction(inst, fn) {
    return function (...args) {
      for (let key of JavaScript.DATA_KEYS_TO_BIND) {
        if (inst && inst[key]) {
          this[key] = inst[key];
        }
      }

      return fn.call(this, ...args);
    };
  }

  async compile(str, inputPath) {
    let inst;
    if (str) {
      // When str has a value, it's being used for permalinks in data
      inst = this._getInstance(str);
    } else {
      // For normal templates, str will be falsy.
      inst = this.getInstanceFromInputPath(inputPath);
    }

    if (inst && "render" in inst) {
      return function (data) {
        // TODO does this do anything meaningful for non-classes?
        // `inst` should have a normalized `render` function from _getInstance

        for (let key of JavaScript.DATA_KEYS_TO_BIND) {
          if (!inst[key] && data[key]) {
            // only blow away existing inst.page if it has a page.url
            if (key !== "page" || !inst.page || inst.page.url) {
              inst[key] = data[key];
            }
          }
        }
        Object.assign(inst, this.getJavaScriptFunctions(inst));

        return this.normalize(inst.render.call(inst, data));
      }.bind(this);
    }
  }

  static shouldSpiderJavaScriptDependencies() {
    return true;
  }
}

module.exports = JavaScript;
