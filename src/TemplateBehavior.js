import { isPlainObject } from "@11ty/eleventy-utils";

class TemplateBehavior {
	constructor(config) {
		this.render = true;
		this.write = true;
		this.outputFormat = null;

		if (!config) {
			throw new Error("Missing config argument in TemplateBehavior");
		}
		this.config = config;
	}

	setRenderableOverride(renderableOverride) {
		this.renderableOverride = renderableOverride;
	}

	// permalink *has* a build key or output is json/ndjson
	isRenderable() {
		return this.renderableOverride ?? (this.render || this.isRenderForced());
	}

	setOutputFormat(format) {
		this.outputFormat = format;
	}

	isRenderForced() {
		return this.outputFormat === "json" || this.outputFormat === "ndjson";
	}

	isWriteable() {
		return this.write;
	}

	// Duplicate logic with TemplatePermalink constructor
	setRenderViaDataCascade(data) {
		// render is false *only* if `build` key does not exist in permalink objects (both in data and eleventyComputed)
		// (note that permalink: false means it won’t write but will still render)

		const keys = new Set();
		if (isPlainObject(data.permalink)) {
			for (const key of Object.keys(data.permalink)) {
				keys.add(key);
			}
		}

		const computedKey = this.config.keys.computed;
		if (computedKey in data && isPlainObject(data[computedKey].permalink)) {
			for (const key of Object.keys(data[computedKey].permalink)) {
				keys.add(key);
			}
		}

		if (keys.size) {
			this.render = keys.has("build");
		}
	}

	setFromPermalink(templatePermalink) {
		// this.render is duplicated between TemplatePermalink and `setRenderViaDataCascade` above
		this.render = templatePermalink._isRendered;

		this.write = templatePermalink._writeToFileSystem;
	}
}
export default TemplateBehavior;
