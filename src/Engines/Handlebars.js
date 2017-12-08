const HandlebarsLib = require('handlebars');
const TemplateEngine = require("./TemplateEngine");

class Handlebars extends TemplateEngine {
	constructor(name, inputDir) {
		super(name, inputDir);

		let partials = super.getPartials();
		for( var name in partials) {
			HandlebarsLib.registerPartial( name, partials[ name ] );
		}
	}

	async compile(str) {
		let fn = HandlebarsLib.compile(str);
		return function(data) {
			return fn(data);
		};
	}
}

module.exports = Handlebars;