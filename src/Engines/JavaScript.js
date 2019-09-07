const TemplateEngine = require("./TemplateEngine");
const TemplatePath = require("../TemplatePath");
const EleventyBaseError = require("../EleventyBaseError");
const deleteRequireCache = require("../Util/DeleteRequireCache");

class JavaScriptTemplateInvalidDataFormatError extends EleventyBaseError {}

class JavaScript extends TemplateEngine {
  constructor(name, includesDir) {
    super(name, includesDir);
    this.instances = {};
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
    let noop = function() {
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

  getInstanceFromInputPath(inputPath) {
    if (this.instances[inputPath]) {
      return this.instances[inputPath];
    }

    const mod = this._getRequire(inputPath);
    let inst = this._getInstance(mod);

    this.instances[inputPath] = inst;
    return inst;
  }

  _getRequire(inputPath) {
    let requirePath = TemplatePath.absolutePath(inputPath);
    return require(requirePath);
  }

  needsToReadFileContents() {
    return false;
  }

  // only remove from cache once on startup (if it already exists)
  initRequireCache(inputPath) {
    let requirePath = TemplatePath.absolutePath(inputPath);
    if (requirePath) {
      deleteRequireCache(requirePath);
    }

    if (inputPath in this.instances) {
      delete this.instances[inputPath];
    }
  }

  async getExtraDataFromFile(inputPath) {
    let inst = this.getInstanceFromInputPath(inputPath);
    if (inst && "data" in inst) {
      // get extra data from `data` method,
      // either as a function or getter or object literal
      let result = await (typeof inst.data === "function"
        ? inst.data()
        : inst.data);
      if (typeof result !== "object") {
        throw new JavaScriptTemplateInvalidDataFormatError(
          `Invalid data format returned from ${inputPath}: typeof ${typeof result}`
        );
      }
      return result;
    }
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
      Object.assign(inst, this.config.javascriptFunctions);

      return function(data) {
        return this.normalize(inst.render.call(inst, data));
      }.bind(this);
    }
  }
}

module.exports = JavaScript;
