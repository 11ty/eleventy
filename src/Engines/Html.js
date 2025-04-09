import TemplateEngine from "./TemplateEngine.js";

export default class Html extends TemplateEngine {
	constructor(name, eleventyConfig) {
		super(name, eleventyConfig);
		this.cacheable = true;
	}

	async compile(str) {
		return function () {
			return str;
		}
	}
}
