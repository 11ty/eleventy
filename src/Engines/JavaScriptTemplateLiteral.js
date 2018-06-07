const TemplateEngine = require("./TemplateEngine");
const EleventyError = require("../EleventyError");

class JavaScriptTemplateLiteral extends TemplateEngine {
  async compile(str, inputPath) {
    return function(data) {
      // avoid `with`
      let dataStr = "";
      for (let j in data) {
        dataStr += `let ${j} = ${JSON.stringify(data[j])};\n`;
      }

      // TODO get rid of this as it doesn’t allow things like: html``
      // add ` around template if it doesn’t exist.
      let trimmedStr = str.trim();
      if (trimmedStr.charAt(trimmedStr.length - 1) !== "`") {
        str = "`" + str + "`";
      }

      let evalStr = `${dataStr}\n${str};`;
      try {
        // TODO switch to https://www.npmjs.com/package/es6-template-strings
        let val = eval(evalStr);
        return val;
      } catch (e) {
        EleventyError.make(`Broken ES6 template:\n${evalStr}`, e);
      }
    };
  }
}

module.exports = JavaScriptTemplateLiteral;
