import TemplateEngine from "./TemplateEngine.js";

export default class Html extends TemplateEngine {
	constructor(name, eleventyConfig) {
		super(name, eleventyConfig);
	}

	get cacheable() {
		return true;
	}

	async #getPreEngine(preTemplateEngine) {
		return this.engineManager.getEngine(preTemplateEngine, this.extensionMap);
	}

	async compile(str, inputPath, preTemplateEngine) {
		if (preTemplateEngine) {
			let engine = await this.#getPreEngine(preTemplateEngine);
			let fnReady = engine.compile(str, inputPath);

			return async function (data) {
				let fn = await fnReady;

				return fn(data);
			};
		}

		return function () {
			// do nothing with data if preTemplateEngine is falsy
			return str;
		};
	}
}
