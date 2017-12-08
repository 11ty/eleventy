const HamlLib = require('hamljs');
const TemplateEngine = require("./TemplateEngine");

class Haml extends TemplateEngine {
	async compile(str) {
		return HamlLib.compile(str);
	}
}

module.exports = Haml;