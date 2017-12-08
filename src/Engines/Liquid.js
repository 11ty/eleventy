const LiquidLib = require('liquidjs');
const TemplateEngine = require("./TemplateEngine");

class Liquid extends TemplateEngine {
	async compile(str) {
		// warning, the include syntax supported here does not match what jekyll uses.
		let engine = LiquidLib({
			root: [super.getInputDir()],
			extname: '.liquid'
		});

		let tmpl = await engine.parse(str);
		return async function(data) {
			return await engine.render(tmpl, data);
		};
	}
}

module.exports = Liquid;