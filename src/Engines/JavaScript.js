const TemplateEngine = require("./TemplateEngine");
const lodashMerge = require("lodash.merge");

class JavaScript extends TemplateEngine {
  async compile(str, inputPath) {
    const cls = require(inputPath);
    if (typeof cls === "string") {
      return function() {
        return cls;
      };
    } else if (typeof cls === "function") {
      if (cls.prototype && "render" in cls.prototype) {
        let inst = new cls(inputPath);
        let dataOverrides;

        if (cls.prototype && "data" in cls.prototype) {
          // work with getter or function
          dataOverrides =
            typeof inst.data === "function" ? inst.data() : inst.data;
        }

        return function(data) {
          if (dataOverrides) {
            return inst.render(lodashMerge({}, data, dataOverrides));
          }

          return inst.render(data);
        };
      }

      return function(data) {
        let result = cls(data || {});
        if (Buffer.isBuffer(result)) {
          return result.toString();
        }

        return result;
      };
    }
  }
}

module.exports = JavaScript;
