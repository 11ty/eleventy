import { TemplatePath } from "@11ty/eleventy-utils";

import TemplateEngine from "./TemplateEngine.js";
import EleventyBaseError from "../EleventyBaseError.js";
import deleteRequireCache from "../Util/DeleteRequireCache.js";
import getJavaScriptData from "../Util/GetJavaScriptData.js";

class JavaScriptTemplateNotDefined extends EleventyBaseError {}

export default class JavaScript extends TemplateEngine {
  constructor(name, dirs, config) {
    super(name, dirs, config);
    this.instances = {};

    this.cacheable = false;
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
      if (
        mod.prototype &&
        ("data" in mod.prototype || "render" in mod.prototype)
      ) {
        if (!("render" in mod.prototype)) {
          mod.prototype.render = noop;
        }
        return new mod();
      } else {
        return { render: mod };
      }
    } else if ("data" in mod || "render" in mod) {
      if (!("render" in mod)) {
        mod.render = noop;
      }
      return mod;
    }
  }

  async getInstanceFromInputPath(inputPath) {
    if (this.instances[inputPath]) {
      return this.instances[inputPath];
    }

    const mod = await this._getImport(inputPath);
    let inst = this._getInstance(mod);

    if (inst) {
      this.instances[inputPath] = inst;
    } else {
      throw new JavaScriptTemplateNotDefined(
        `No JavaScript template returned from ${inputPath} (did you export default?)`
      );
    }
    return inst;
  }

  async _getImport(inputPath) {
    let requirePath = TemplatePath.absolutePath(inputPath);
    return import(requirePath);
  }

  needsToReadFileContents() {
    return false;
  }

  // only remove from cache once on startup (if it already exists)
  initRequireCache(inputPath) {
    deleteRequireCache(inputPath);

    if (inputPath in this.instances) {
      delete this.instances[inputPath];
    }
  }

  async getExtraDataFromFile(inputPath) {
    let inst = await this.getInstanceFromInputPath(inputPath);
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
        // note: bind creates a new function
        fns[key] = configFns[key].bind(inst);
      }
    }
    return fns;
  }

  async compile(str, inputPath) {
    let inst;
    if (str) {
      // When str has a value, it's being used for permalinks in data
      inst = this._getInstance(str);
    } else {
      // For normal templates, str will be falsy.
      inst = await this.getInstanceFromInputPath(inputPath);
    }
    if (inst && "render" in inst) {
      return function (data) {
        // only blow away existing inst.page if it has a page.url
        if (!inst.page || inst.page.url) {
          inst.page = data.page;
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
