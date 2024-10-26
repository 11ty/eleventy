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
		this.originalDisplayPath =
			TemplatePath.join(this.layoutsDir, this.originalPath) +
			` (via \`layout: ${this.originalPath}\`)`; // for error messaging

		this.path = path;
		this.aliases = {};
		this.extensionMap = extensionMap;
		if (!extensionMap) {
			throw new Error("Expected `extensionMap` in TemplateLayoutPathResolver constructor.");
		}

		this.init();
	}

	getVirtualTemplate(layoutPath) {
		let inputDirRelativePath =
			this.eleventyConfig.directories.getLayoutPathRelativeToInputDirectory(layoutPath);
		return this.config.virtualTemplates[inputDirRelativePath];
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

	exists(layoutPath) {
		if (this.getVirtualTemplate(layoutPath)) {
			return true;
		}
		let fullPath = this.eleventyConfig.directories.getLayoutPath(layoutPath);
		if (fs.existsSync(fullPath)) {
			return true;
		}
		return false;
	}

	init() {
		// we might be able to move this into the constructor?
		this.aliases = Object.assign({}, this.config.layoutAliases, this.aliases);

		if (this.aliases[this.path]) {
			this.path = this.aliases[this.path];
		}

		let useLayoutResolution = this.config.layoutResolution;

		if (this.path.split(".").length > 0 && this.exists(this.path)) {
			this.filename = this.path;
			this.fullPath = this.eleventyConfig.directories.getLayoutPath(this.path);
		} else if (useLayoutResolution) {
			this.filename = this.findFileName();
			this.fullPath = this.eleventyConfig.directories.getLayoutPath(this.filename || "");
		}
	}

	addLayoutAlias(from, to) {
		this.aliases[from] = to;
	}

	getFileName() {
		if (!this.filename) {
			throw new Error(
				`You’re trying to use a layout that does not exist: ${this.originalDisplayPath}`,
			);
		}

		return this.filename;
	}

	getFullPath() {
		if (!this.filename) {
			throw new Error(
				`You’re trying to use a layout that does not exist: ${this.originalDisplayPath}`,
			);
		}

		return this.fullPath;
	}

	findFileName() {
		for (let filename of this.extensionMap.getFileList(this.path)) {
			if (this.exists(filename)) {
				return filename;
			}
		}
	}

	getNormalizedLayoutKey() {
		return TemplatePath.stripLeadingSubPath(this.fullPath, this.layoutsDir);
	}
}

export default TemplateLayoutPathResolver;
