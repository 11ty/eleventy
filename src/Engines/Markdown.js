import markdownIt from "markdown-it";

import TemplateEngine from "./TemplateEngine.js";

export default class Markdown extends TemplateEngine {
	constructor(name, eleventyConfig) {
		super(name, eleventyConfig);

		this.markdownOptions = {};

		this.setLibrary(this.config.libraryOverrides.md);
	}

	get cacheable() {
		return true;
	}

	setLibrary(mdLib) {
		this.mdLib = mdLib || markdownIt(this.getMarkdownOptions());

		// Overrides a highlighter set in `markdownOptions`
		// This is separate so devs can pass in a new mdLib and still use the official eleventy plugin for markdown highlighting
		if (this.config.markdownHighlighter && typeof this.mdLib.set === "function") {
			this.mdLib.set({
				highlight: this.config.markdownHighlighter,
			});
		}

		if (typeof this.mdLib.disable === "function") {
			// Disable indented code blocks by default (Issue #2438)
			this.mdLib.disable("code");
		}

		this.setEngineLib(this.mdLib, Boolean(this.config.libraryOverrides.md));
	}

	setMarkdownOptions(options) {
		this.markdownOptions = options;
	}

	getMarkdownOptions() {
		// work with "mode" presets https://github.com/markdown-it/markdown-it#init-with-presets-and-options
		if (typeof this.markdownOptions === "string") {
			return this.markdownOptions;
		}

		return Object.assign(
			{
				html: true,
			},
			this.markdownOptions || {},
		);
	}

	// TODO use preTemplateEngine to help inform this
	// needsCompilation() {
	// 	return super.needsCompilation();
	// }

	async #getPreEngine(preTemplateEngine) {
		if (typeof preTemplateEngine === "string") {
			return this.engineManager.getEngine(preTemplateEngine, this.extensionMap);
		}

		return preTemplateEngine;
	}

	async compile(str, inputPath, preTemplateEngine, bypassMarkdown) {
		let mdlib = this.mdLib;

		if (preTemplateEngine) {
			let engine = await this.#getPreEngine(preTemplateEngine);
			let fnReady = engine.compile(str, inputPath);

			if (bypassMarkdown) {
				return async function (data) {
					let fn = await fnReady;
					return fn(data);
				};
			} else {
				return async function (data) {
					let fn = await fnReady;
					let preTemplateEngineRender = await fn(data);
					let finishedRender = mdlib.render(preTemplateEngineRender, data);
					return finishedRender;
				};
			}
		} else {
			if (bypassMarkdown) {
				return function () {
					return str;
				};
			} else {
				return function (data) {
					return mdlib.render(str, data);
				};
			}
		}
	}
}
