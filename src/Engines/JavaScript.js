const TemplateEngine = require("./TemplateEngine");
const TemplatePath = require("../TemplatePath");
const lodashMerge = require("lodash.merge");

class JavaScript extends TemplateEngine {
  cleanup(result) {
    if (Buffer.isBuffer(result)) {
      return result.toString();
    }

    return result;
  }

  getRequire(inputPath) {
    let requirePath = TemplatePath.localPath(inputPath);
    delete require.cache[requirePath];
    return require(requirePath);
  }

  needsToReadFileContents() {
    return false;
  }

  async getExtraDataFromFile(inputPath) {
    const cls = this.getRequire(inputPath);
    if (typeof cls === "function") {
      if (cls.prototype && "data" in cls.prototype) {
        let inst = new cls();
        // get extra data from `data` method,
        // either as a function or getter or object literal
        return typeof inst.data === "function" ? await inst.data() : inst.data;
      }
    }

    return {};
  }

  async compile(str, inputPath) {
    const cls = this.getRequire(inputPath);
    if (typeof cls === "function") {
      // class with a `render` method
      if (cls.prototype && "render" in cls.prototype) {
        let inst = new cls();
        Object.assign(inst, this.config.javascriptFunctions);
        return function(data) {
          return this.cleanup(inst.render.call(inst, data));
        }.bind(this);
      }

      // raw function
      return function(data) {
        return this.cleanup(cls.call(this.config.javascriptFunctions, data));
      }.bind(this);
    } else {
      // string type does not work with javascriptFunctions
      return function() {
        return this.cleanup(cls);
      }.bind(this);
    }
  }
}

module.exports = JavaScript;
