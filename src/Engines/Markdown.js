import markdownIt from "markdown-it";

import TemplateEngine from "./TemplateEngine.js";

class Markdown extends TemplateEngine {
	constructor(name, dirs, config) {
		super(name, dirs, config);

		this.markdownOptions = {};

		this.setLibrary(this.config.libraryOverrides.md);

		this.cacheable = true;
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

		this.setEngineLib(this.mdLib);
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

	async compile(str, inputPath, preTemplateEngine, bypassMarkdown) {
		const mdlib = this.mdLib;

		if (preTemplateEngine) {
			let engine;
			if (typeof preTemplateEngine === "string") {
				engine = await this.engineManager.getEngine(
					preTemplateEngine,
					this.dirs,
					this.extensionMap,
				);
			} else {
				engine = preTemplateEngine;
			}

			const fnReady = engine.compile(str, inputPath);

			if (bypassMarkdown) {
				return async function (data) {
					const fn = await fnReady;
					return fn(data);
				};
			} else {
				return async function (data) {
					const fn = await fnReady;
					const preTemplateEngineRender = await fn(data);
					const finishedRender = mdlib.render(preTemplateEngineRender, data);
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

export default Markdown;
