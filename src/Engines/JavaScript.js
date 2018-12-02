const TemplateEngine = require("./TemplateEngine");
const lodashMerge = require("lodash.merge");

class JavaScript extends TemplateEngine {
  async compile(str, inputPath) {
    const cls = require(inputPath);
    if (typeof cls === "string") {
      // string type does not work with javascriptFunctions
      return function() {
        return cls;
      };
    } else if (typeof cls === "function") {
      // class with a `render` method
      if (cls.prototype && "render" in cls.prototype) {
        let inst = new cls(inputPath);
        let dataOverrides = {};
        // get extra data from `data` method,
        // either as a function or getter or object literal
        if (cls.prototype && "data" in cls.prototype) {
          dataOverrides =
            typeof inst.data === "function" ? inst.data() : inst.data;
        }

        Object.assign(inst, this.config.javascriptFunctions);
        return function(data) {
          if (dataOverrides) {
            // TODO fork on deepDataMerge
            return inst.render.call(inst, lodashMerge({}, data, dataOverrides));
          }

          return inst.render.call(inst, data);
        };
      }

      // raw function
      return function(data) {
        let result = cls.call(this.config.javascriptFunctions, data);
        if (Buffer.isBuffer(result)) {
          return result.toString();
        }

        return result;
      }.bind(this);
    }
  }
}

module.exports = JavaScript;
