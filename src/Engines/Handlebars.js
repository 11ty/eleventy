const HandlebarsLib = require('handlebars');
const TemplateEngine = require("./TemplateEngine");
const TemplateConfig = require("../TemplateConfig");

let templateCfg = new TemplateConfig(require("../../config.json"));
let cfg = templateCfg.getConfig();

class Handlebars extends TemplateEngine {
	constructor(name, inputDir) {
		super(name, inputDir);

		let partials = super.getPartials();
		for( let name in partials) {
			HandlebarsLib.registerPartial( name, partials[ name ] );
		}

		this.addHelpers(cfg.handlebarsHelpers);
	}

	addHelpers(helpers) {
		for( let name in helpers) {
			HandlebarsLib.registerHelper( name, helpers[ name ] );
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