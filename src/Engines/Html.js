import TemplateEngine from "./TemplateEngine.js";

class Html extends TemplateEngine {
	constructor(name, dirs, config) {
		super(name, dirs, config);
		this.cacheable = true;
	}

	async compile(str, inputPath, preTemplateEngine) {
		if (preTemplateEngine) {
			let engine = await this.engineManager.getEngine(
				preTemplateEngine,
				this.dirs,
				this.extensionMap,
			);
			let fnReady = engine.compile(str, inputPath);

			return async function (data) {
				let fn = await fnReady;

				return fn(data);
			};
		} else {
			return function () {
				// do nothing with data if parseHtmlWith is falsy
				return str;
			};
		}
	}
}

export default Html;
