const MustacheLib = require('mustache');
const TemplateEngine = require("./TemplateEngine");

class Mustache extends TemplateEngine {
	async compile(str) {
		let partials = super.getPartials();
		return function(data) {
			return MustacheLib.render(str, data, partials).trim();
		};
	}
}

module.exports = Mustache;