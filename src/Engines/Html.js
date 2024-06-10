import TemplateEngine from "./TemplateEngine.js";

class Html extends TemplateEngine {
	constructor(name, eleventyConfig) {
		super(name, eleventyConfig);
		this.cacheable = true;
	}

	async compile(str, inputPath, preTemplateEngine) {
		if (preTemplateEngine) {
			let engine = await this.engineManager.getEngine(preTemplateEngine, this.extensionMap);
			let fnReady = engine.compile(str, inputPath);

			return async function (data) {
				let fn = await fnReady;

				return fn(data);
			};
		}

		return function () {
			// do nothing with data if parseHtmlWith is falsy
			return str;
		};
	}
}

export default Html;
