const TemplateEngine = require("./TemplateEngine");
const TemplatePath = require("../TemplatePath");

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

  getInstanceFromInputPath(inputPath) {
    if (this.instances[inputPath]) {
      return this.instances[inputPath];
    }

    const cls = this._getRequire(inputPath);
    if (typeof cls === "function") {
      if (
        cls.prototype &&
        ("data" in cls.prototype || "render" in cls.prototype)
      ) {
        let inst = new cls();
        this.instances[inputPath] = inst;
        return inst;
      }
    }
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
    if (requirePath in require.cache) {
      delete require.cache[requirePath];
    }

    if (inputPath in this.instances) {
      delete this.instances[inputPath];
    }
  }

  async getExtraDataFromFile(inputPath) {
    let inst = this.getInstanceFromInputPath(inputPath);
    if (inst) {
      // get extra data from `data` method,
      // either as a function or getter or object literal
      return typeof inst.data === "function" ? await inst.data() : inst.data;
    }

    const cls = this._getRequire(inputPath);
    if (typeof cls === "object") {
      return typeof cls.data === "function" ? await cls.data() : cls.data;
    }
  }

  async compile(str, inputPath) {
    // for permalinks
    if (str) {
      // works with String, Buffer, Function!
      return function(data) {
        let target = str;
        if (typeof str === "function") {
          target = str.call(this.config.javascriptFunctions, data);
        }
        return this.normalize(target);
      }.bind(this);
    }

    // for all other requires, str will be falsy
    const cls = this._getRequire(inputPath);
    if (typeof cls === "function") {
      // class with a `render` method
      if (cls.prototype && "render" in cls.prototype) {
        let inst = this.getInstanceFromInputPath(inputPath);
        Object.assign(inst, this.config.javascriptFunctions);
        return function(data) {
          return this.normalize(inst.render.call(inst, data));
        }.bind(this);
      }

      // raw function
      return function(data) {
        return this.normalize(cls.call(this.config.javascriptFunctions, data));
      }.bind(this);
    } else if (typeof cls === "object" && "render" in cls) {
      return function(data) {
        return this.normalize(
          cls.render.call(this.config.javascriptFunctions, data)
        );
      }.bind(this);
    } else {
      // string type does not work with javascriptFunctions
      return function() {
        return this.normalize(cls);
      }.bind(this);
    }
  }
}

module.exports = JavaScript;
