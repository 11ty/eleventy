const TemplateEngine = require("./TemplateEngine");

class JavaScript extends TemplateEngine {
  async compile(str) {
    return function(data) {
      // avoid `with`
      let dataStr = "";
      for (var j in data) {
        dataStr += `let ${j} = ${JSON.stringify(data[j])};\n`;
      }

      // add ` around template if it doesn’t exist.
      let trimmedStr = str.trim();
      if (trimmedStr.charAt(trimmedStr.length - 1) !== "`") {
        str = "`" + str + "`";
      }

      try {
        // TODO switch to https://www.npmjs.com/package/es6-template-strings
        let val = eval(dataStr + "\n" + str + ";");
        return val;
      } catch (e) {
        console.log("Broken ES6 template: ", dataStr + "\n" + str + ";");
        throw e;
      }
    };
  }
}

module.exports = JavaScript;
