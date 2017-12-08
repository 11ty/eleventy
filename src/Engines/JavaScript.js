const TemplateEngine = require("./TemplateEngine");

class JavaScript extends TemplateEngine {
	async compile(str) {
		return function(data) {
			// avoid `with`
			let dataStr = '';
			for(var j in data) {
				dataStr += `let ${j} = ${JSON.stringify(data[j])};\n`;
			}
			// add ` around template if it doesn’t exist.
			let trimmedStr = str.trim();
			if( trimmedStr.charAt(trimmedStr.length - 1) !== "`" ) {
				str = "`" + str + "`";
			}
			// TODO switch to https://www.npmjs.com/package/es6-template-strings
			// sorry not sorry, buncha template engines do eval (ejs, for one)
			return eval(dataStr + "\n" + str + ";");
		};
	}
}

module.exports = JavaScript;