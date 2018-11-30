const TemplateEngine = require("./TemplateEngine");
const lodashMerge = require("lodash.merge");

class JavaScript extends TemplateEngine {
  get javascriptFunctions() {
    return Object.assign({}, this.config.javascriptFunctions);
  }

  async compile(str, inputPath) {
    const cls = require(inputPath);
    if (typeof cls === "string") {
      return function() {
        return cls;
      };
    } else if (typeof cls === "function") {
      let dataOverrides = {};
      if (cls.prototype && "render" in cls.prototype) {
        let inst = new cls(inputPath);

        if (cls.prototype && "data" in cls.prototype) {
          // work with getter or function
          dataOverrides =
            typeof inst.data === "function" ? inst.data() : inst.data;
        }

        Object.assign(dataOverrides, this.javascriptFunctions);

        return function(data) {
          if (dataOverrides) {
            return inst.render(lodashMerge({}, data, dataOverrides));
          }

          return inst.render(data);
        };
      }

      Object.assign(dataOverrides, this.javascriptFunctions);
      return function(data) {
        let result = cls(lodashMerge({}, data, dataOverrides));
        if (Buffer.isBuffer(result)) {
          return result.toString();
        }

        return result;
      };
    }
  }
}

module.exports = JavaScript;
