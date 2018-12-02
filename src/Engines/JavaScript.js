const TemplateEngine = require("./TemplateEngine");
const lodashMerge = require("lodash.merge");

function cleanup(result) {
  if (Buffer.isBuffer(result)) {
    return result.toString();
  }

  return result;
}

class JavaScript extends TemplateEngine {
  async compile(str, inputPath) {
    const cls = require(inputPath);
    if (typeof cls === "function") {
      // class with a `render` method
      if (cls.prototype && "render" in cls.prototype) {
        let inst = new cls(inputPath);
        let dataOverrides = {};
        // get extra data from `data` method,
        // either as a function or getter or object literal
        if (cls.prototype && "data" in cls.prototype) {
          dataOverrides =
            typeof inst.data === "function" ? await inst.data() : inst.data;
        }

        Object.assign(inst, this.config.javascriptFunctions);
        return function(data) {
          if (dataOverrides) {
            // TODO fork on deepDataMerge
            return cleanup(
              inst.render.call(inst, lodashMerge({}, data, dataOverrides))
            );
          }
          return cleanup(inst.render.call(inst, data));
        };
      }

      // raw function
      return function(data) {
        return cleanup(cls.call(this.config.javascriptFunctions, data));
      }.bind(this);
    } else {
      // string type does not work with javascriptFunctions
      return function() {
        return cleanup(cls);
      };
    }
  }
}

module.exports = JavaScript;
