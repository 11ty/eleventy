const TemplateEngine = require("./TemplateEngine");

class JavaScript extends TemplateEngine {
  async compile(str, inputPath) {
    const cls = require(inputPath);
    if (typeof cls === "function") {
      if (cls.prototype && "render" in cls.prototype) {
        let inst = new cls(inputPath);
        return function(data) {
          return inst.render(data);
        };
      }

      return cls;
    }
  }
}

module.exports = JavaScript;
