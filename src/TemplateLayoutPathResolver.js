import fs from "node:fs";
import { TemplatePath } from "@11ty/eleventy-utils";
// import debugUtil from "debug";
// const debug = debugUtil("Eleventy:TemplateLayoutPathResolver");

class TemplateLayoutPathResolver {
	constructor(path, extensionMap, eleventyConfig) {
		if (!eleventyConfig) {
			throw new Error("Expected `eleventyConfig` in TemplateLayoutPathResolver constructor");
		}

		this.eleventyConfig = eleventyConfig;
		this.originalPath = path;
		this.path = path;
		this.aliases = {};
		this.extensionMap = extensionMap;
		if (!extensionMap) {
			throw new Error("Expected `extensionMap` in TemplateLayoutPathResolver constructor.");
		}

		this.init();
	}

	get dirs() {
		return this.eleventyConfig.directories;
	}

	get inputDir() {
		return this.dirs.input;
	}

	get layoutsDir() {
		return this.dirs.layouts || this.dirs.includes;
	}

	/* Backwards compat */
	getLayoutsDir() {
		return this.layoutsDir;
	}

	setAliases() {
		this.aliases = Object.assign({}, this.config.layoutAliases, this.aliases);
	}

	// for testing
	set config(cfg) {
		this._config = cfg;
		this.init();
	}

	get config() {
		if (this.eleventyConfig) {
			return this.eleventyConfig.getConfig();
		} else {
			throw new Error("Missing this.eleventyConfig");
		}
	}

	init() {
		// we might be able to move this into the constructor?
		this.aliases = Object.assign({}, this.config.layoutAliases, this.aliases);
		// debug("Current layout aliases: %o", this.aliases);

		if (this.path in this.aliases) {
			// debug(
			//   "Substituting layout: %o maps to %o",
			//   this.path,
			//   this.aliases[this.path]
			// );
			this.path = this.aliases[this.path];
		}

		let useLayoutResolution = this.config.layoutResolution;

		this.pathAlreadyHasExtension = TemplatePath.join(this.layoutsDir, this.path);

		if (this.path.split(".").length > 0 && fs.existsSync(this.pathAlreadyHasExtension)) {
			this.filename = this.path;
			this.fullPath = TemplatePath.addLeadingDotSlash(this.pathAlreadyHasExtension);
		} else if (useLayoutResolution) {
			this.filename = this.findFileName();
			this.fullPath = TemplatePath.addLeadingDotSlash(
				TemplatePath.join(this.layoutsDir, this.filename || ""),
			);
		}
	}

	addLayoutAlias(from, to) {
		this.aliases[from] = to;
	}

	getFileName() {
		if (!this.filename) {
			throw new Error(
				`You’re trying to use a layout that does not exist: ${this.originalPath}${this.filename ? ` (${this.filename})` : ""}`,
			);
		}

		return this.filename;
	}

	getFullPath() {
		if (!this.filename) {
			throw new Error(
				`You’re trying to use a layout that does not exist: ${this.originalPath}${this.filename ? ` (${this.filename})` : ""}`,
			);
		}

		return this.fullPath;
	}

	findFileName() {
		if (!fs.existsSync(this.layoutsDir)) {
			throw Error(
				"TemplateLayoutPathResolver directory does not exist for " +
					this.path +
					": " +
					this.layoutsDir,
			);
		}

		for (let filename of this.extensionMap.getFileList(this.path)) {
			// TODO async
			if (fs.existsSync(TemplatePath.join(this.layoutsDir, filename))) {
				return filename;
			}
		}
	}

	getNormalizedLayoutKey() {
		return TemplatePath.stripLeadingSubPath(this.fullPath, this.layoutsDir);
	}
}

export default TemplateLayoutPathResolver;
