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

  removeJSExtension(path) {
    return path.endsWith(".js") ? path.substring(0, path.length - 3) : path;
  }

  async compile(str, inputPath) {
    let requirePath = TemplatePath.localPath(inputPath);
    delete require.cache[requirePath];
    const cls = require(this.removeJSExtension(requirePath));
    if (typeof cls === "function") {
      // class with a `render` method
      if (cls.prototype && "render" in cls.prototype) {
        let inst = new cls();
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
            return this.cleanup(
              inst.render.call(inst, lodashMerge({}, data, dataOverrides))
            );
          }
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
