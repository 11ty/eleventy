import util from "node:util";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import lodash from "@11ty/lodash-custom";
import { DateTime } from "luxon";
import { TemplatePath, isPlainObject } from "@11ty/eleventy-utils";
import debugUtil from "debug";
import chalk from "kleur";

import ConsoleLogger from "./Util/ConsoleLogger.js";
import getDateFromGitLastUpdated from "./Util/DateGitLastUpdated.js";
import getDateFromGitFirstAdded from "./Util/DateGitFirstAdded.js";
import TemplateData from "./Data/TemplateData.js";
import TemplateContent from "./TemplateContent.js";
import TemplatePermalink from "./TemplatePermalink.js";
import TemplateLayout from "./TemplateLayout.js";
import TemplateFileSlug from "./TemplateFileSlug.js";
import ComputedData from "./Data/ComputedData.js";
import Pagination from "./Plugins/Pagination.js";
import TemplateBehavior from "./TemplateBehavior.js";
import TemplateContentPrematureUseError from "./Errors/TemplateContentPrematureUseError.js";
import TemplateContentUnrenderedTemplateError from "./Errors/TemplateContentUnrenderedTemplateError.js";
import EleventyBaseError from "./Errors/EleventyBaseError.js";
import ReservedData from "./Util/ReservedData.js";
import TransformsUtil from "./Util/TransformsUtil.js";
import { FileSystemManager } from "./Util/FileSystemManager.js";

const { set: lodashSet, get: lodashGet } = lodash;
const fsStat = util.promisify(fs.stat);

const debug = debugUtil("Eleventy:Template");
const debugDev = debugUtil("Dev:Eleventy:Template");

class Template extends TemplateContent {
	#logger;
	#fsManager;

	constructor(templatePath, templateData, extensionMap, config) {
		debugDev("new Template(%o)", templatePath);
		super(templatePath, config);

		this.parsed = path.parse(templatePath);

		// for pagination
		this.extraOutputSubdirectory = "";

		this.extensionMap = extensionMap;
		this.templateData = templateData;
		this.#initFileSlug();

		this.linters = [];
		this.transforms = {};

		this.isVerbose = true;
		this.isDryRun = false;
		this.writeCount = 0;

		this.fileSlug = new TemplateFileSlug(this.inputPath, this.extensionMap, this.eleventyConfig);
		this.fileSlugStr = this.fileSlug.getSlug();
		this.filePathStem = this.fileSlug.getFullPathWithoutExtension();

		this.outputFormat = "fs";

		this.behavior = new TemplateBehavior(this.config);
		this.behavior.setOutputFormat(this.outputFormat);
	}

	#initFileSlug() {
		this.fileSlug = new TemplateFileSlug(this.inputPath, this.extensionMap, this.eleventyConfig);
		this.fileSlugStr = this.fileSlug.getSlug();
		this.filePathStem = this.fileSlug.getFullPathWithoutExtension();
	}

	/* mimic constructor arg order */
	resetCachedTemplate({ templateData, extensionMap, eleventyConfig }) {
		super.resetCachedTemplate({ eleventyConfig });
		this.templateData = templateData;
		this.extensionMap = extensionMap;
		// this.#fsManager = undefined;
		this.#initFileSlug();
	}

	get fsManager() {
		if (!this.#fsManager) {
			this.#fsManager = new FileSystemManager(this.eleventyConfig);
		}
		return this.#fsManager;
	}

	get logger() {
		if (!this.#logger) {
			this.#logger = new ConsoleLogger();
			this.#logger.isVerbose = this.isVerbose;
		}
		return this.#logger;
	}

	/* Setter for Logger */
	set logger(logger) {
		this.#logger = logger;
	}

	isRenderable() {
		return this.behavior.isRenderable();
	}

	isRenderableDisabled() {
		return this.behavior.isRenderableDisabled();
	}

	isRenderableOptional() {
		// A template that is lazily rendered once if used by a second order dependency of another template dependency.
		// e.g. You change firstpost.md, which is used by feed.xml, but secondpost.md (also used by feed.xml)
		// has not yet rendered and needs to be rendered once to populate the cache.
		return this.behavior.isRenderableOptional();
	}

	setRenderableOverride(renderableOverride) {
		this.behavior.setRenderableOverride(renderableOverride);
	}

	reset() {
		this.renderCount = 0;
		this.writeCount = 0;
	}

	resetCaches(types) {
		types = this.getResetTypes(types);

		super.resetCaches(types);

		if (types.data) {
			delete this._dataCache;
			// delete this._usePermalinkRoot;
			// delete this._stats;
		}

		if (types.render) {
			delete this._cacheRenderedPromise;
			delete this._cacheRenderedTransformsAndLayoutsPromise;
		}
	}

	setOutputFormat(to) {
		this.outputFormat = to;
		this.behavior.setOutputFormat(to);
	}

	setIsVerbose(isVerbose) {
		this.isVerbose = isVerbose;
		this.logger.isVerbose = isVerbose;
	}

	setDryRunViaIncremental(isIncremental) {
		this.isDryRun = isIncremental;
		this.isIncremental = isIncremental;
	}

	setDryRun(isDryRun) {
		this.isDryRun = !!isDryRun;
	}

	setExtraOutputSubdirectory(dir) {
		this.extraOutputSubdirectory = dir + "/";
	}

	getTemplateSubfolder() {
		return TemplatePath.stripLeadingSubPath(this.parsed.dir, this.inputDir);
	}

	templateUsesLayouts(pageData) {
		if (this.hasTemplateRender()) {
			return pageData?.[this.config.keys.layout] && this.templateRender.engine.useLayouts();
		}

		// If `layout` prop is set, default to true when engine is unknown
		return Boolean(pageData?.[this.config.keys.layout]);
	}

	getLayout(layoutKey) {
		// already cached downstream in TemplateLayout -> TemplateCache
		try {
			return TemplateLayout.getTemplate(layoutKey, this.eleventyConfig, this.extensionMap);
		} catch (e) {
			throw new EleventyBaseError(
				`Problem creating an Eleventy Layout for the "${this.inputPath}" template file.`,
				e,
			);
		}
	}

	get baseFile() {
		return this.extensionMap.removeTemplateExtension(this.parsed.base);
	}

	async _getRawPermalinkInstance(permalinkValue) {
		let perm = new TemplatePermalink(permalinkValue, this.extraOutputSubdirectory);
		perm.setUrlTransforms(this.config.urlTransforms);

		this.behavior.setFromPermalink(perm);

		return perm;
	}

	async _getLink(data) {
		if (!data) {
			throw new Error("Internal error: data argument missing in Template->_getLink");
		}

		let permalink = data[this.config.keys.permalink];
		let permalinkValue;

		// `permalink: false` means render but no file system write, e.g. use in collections only)
		// `permalink: true` throws an error
		if (typeof permalink === "boolean") {
			debugDev("Using boolean permalink %o", permalink);
			permalinkValue = permalink;
		} else if (permalink && (!this.config.dynamicPermalinks || data.dynamicPermalink === false)) {
			debugDev("Not using dynamic permalinks, using %o", permalink);
			permalinkValue = permalink;
		} else if (isPlainObject(permalink)) {
			// Empty permalink {} object should act as if no permalink was set at all
			// and inherit the default behavior
			let isEmptyObject = Object.keys(permalink).length === 0;
			if (!isEmptyObject) {
				let promises = [];
				let keys = [];
				for (let key in permalink) {
					keys.push(key);
					if (key !== "build" && Array.isArray(permalink[key])) {
						promises.push(
							Promise.all([...permalink[key]].map((entry) => super.renderPermalink(entry, data))),
						);
					} else {
						promises.push(super.renderPermalink(permalink[key], data));
					}
				}

				let results = await Promise.all(promises);

				permalinkValue = {};
				for (let j = 0, k = keys.length; j < k; j++) {
					let key = keys[j];
					permalinkValue[key] = results[j];
					debug(
						"Rendering permalink.%o for %o: %s becomes %o",
						key,
						this.inputPath,
						permalink[key],
						results[j],
					);
				}
			}
		} else if (permalink) {
			// render variables inside permalink front matter, bypass markdown
			permalinkValue = await super.renderPermalink(permalink, data);
			debug("Rendering permalink for %o: %s becomes %o", this.inputPath, permalink, permalinkValue);
			debugDev("Permalink rendered with data: %o", data);
		}

		// Override default permalink behavior. Only do this if permalink was _not_ in the data cascade
		if (!permalink && this.config.dynamicPermalinks && data.dynamicPermalink !== false) {
			let tr = await this.getTemplateRender();
			let permalinkCompilation = tr.engine.permalinkNeedsCompilation("");
			if (typeof permalinkCompilation === "function") {
				let ret = await this._renderFunction(permalinkCompilation, permalinkValue, this.inputPath);
				if (ret !== undefined) {
					if (typeof ret === "function") {
						// function
						permalinkValue = await this._renderFunction(ret, data);
					} else {
						// scalar
						permalinkValue = ret;
					}
				}
			}
		}

		if (permalinkValue !== undefined) {
			return this._getRawPermalinkInstance(permalinkValue);
		}

		// No `permalink` specified in data cascade, do the default
		let p = TemplatePermalink.generate(
			this.getTemplateSubfolder(),
			this.baseFile,
			this.extraOutputSubdirectory,
			this.engine.defaultTemplateFileExtension,
		);
		p.setUrlTransforms(this.config.urlTransforms);
		return p;
	}

	async usePermalinkRoot() {
		// @cachedproperty
		if (this._usePermalinkRoot === undefined) {
			// TODO this only works with immediate front matter and not data files
			let { data } = await this.getFrontMatterData();
			this._usePermalinkRoot = data[this.config.keys.permalinkRoot];
		}

		return this._usePermalinkRoot;
	}

	async getOutputLocations(data) {
		this.bench.get("(count) getOutputLocations").incrementCount();
		let link = await this._getLink(data);

		let path;
		if (await this.usePermalinkRoot()) {
			path = link.toPathFromRoot();
		} else {
			path = link.toPath(this.outputDir);
		}

		return {
			linkInstance: link,
			rawPath: link.toOutputPath(),
			href: link.toHref(),
			path: path,
		};
	}

	// This is likely now a test-only method
	// Preferred to use the singular `getOutputLocations` above.
	async getRawOutputPath(data) {
		this.bench.get("(count) getRawOutputPath").incrementCount();
		let link = await this._getLink(data);
		return link.toOutputPath();
	}

	// Preferred to use the singular `getOutputLocations` above.
	async getOutputHref(data) {
		this.bench.get("(count) getOutputHref").incrementCount();
		let link = await this._getLink(data);
		return link.toHref();
	}

	// Preferred to use the singular `getOutputLocations` above.
	async getOutputPath(data) {
		this.bench.get("(count) getOutputPath").incrementCount();
		let link = await this._getLink(data);
		if (await this.usePermalinkRoot()) {
			return link.toPathFromRoot();
		}
		return link.toPath(this.outputDir);
	}

	async _testGetAllLayoutFrontMatterData() {
		let { data: frontMatterData } = await this.getFrontMatterData();

		if (frontMatterData[this.config.keys.layout]) {
			let layout = this.getLayout(frontMatterData[this.config.keys.layout]);
			return await layout.getData();
		}
		return {};
	}

	async #getData() {
		debugDev("%o getData", this.inputPath);
		let localData = {};
		let globalData = {};

		if (this.templateData) {
			localData = await this.templateData.getTemplateDirectoryData(this.inputPath);
			globalData = await this.templateData.getGlobalData(this.inputPath);
			debugDev("%o getData getTemplateDirectoryData and getGlobalData", this.inputPath);
		}

		let { data: frontMatterData } = await this.getFrontMatterData();

		let mergedLayoutData = {};
		let tr = await this.getTemplateRender();
		if (tr.engine.useLayouts()) {
			let layoutKey =
				frontMatterData[this.config.keys.layout] ||
				localData[this.config.keys.layout] ||
				globalData[this.config.keys.layout];

			// Layout front matter data
			if (layoutKey) {
				let layout = this.getLayout(layoutKey);

				mergedLayoutData = await layout.getData();
				debugDev("%o getData merged layout chain front matter", this.inputPath);
			}
		}

		try {
			let mergedData = TemplateData.mergeDeep(
				this.config.dataDeepMerge,
				{},
				globalData,
				mergedLayoutData,
				localData,
				frontMatterData,
			);

			if (this.config.freezeReservedData) {
				ReservedData.check(mergedData);
			}

			await this.addPage(mergedData);

			debugDev("%o getData mergedData", this.inputPath);

			return mergedData;
		} catch (e) {
			if (
				ReservedData.isReservedDataError(e) ||
				(e instanceof TypeError &&
					e.message.startsWith("Cannot add property") &&
					e.message.endsWith("not extensible"))
			) {
				throw new EleventyBaseError(
					`You attempted to set one of Eleventy’s reserved data property names${e.reservedNames ? `: ${e.reservedNames.join(", ")}` : ""}. You can opt-out of this behavior with \`eleventyConfig.setFreezeReservedData(false)\` or rename/remove the property in your data cascade that conflicts with Eleventy’s reserved property names (e.g. \`eleventy\`, \`pkg\`, and others). Learn more: https://v3.11ty.dev/docs/data-eleventy-supplied/`,
					e,
				);
			}

			throw e;
		}
	}

	async getData() {
		if (!this._dataCache) {
			// @cachedproperty
			this._dataCache = this.#getData();
		}

		return this._dataCache;
	}

	async addPage(data) {
		if (!("page" in data)) {
			data.page = {};
		}

		// Make sure to keep these keys synchronized in src/Util/ReservedData.js
		data.page.inputPath = this.inputPath;
		data.page.fileSlug = this.fileSlugStr;
		data.page.filePathStem = this.filePathStem;
		data.page.outputFileExtension = this.engine.defaultTemplateFileExtension;
		data.page.templateSyntax = this.templateRender.getEnginesList(
			data[this.config.keys.engineOverride],
		);

		let newDate = await this.getMappedDate(data);
		// Skip date assignment if custom date is falsy.
		if (newDate) {
			data.page.date = newDate;
		}

		// data.page.url
		// data.page.outputPath
		// data.page.excerpt from gray-matter and Front Matter
		// data.page.lang from I18nPlugin
	}

	// Tests only
	async render() {
		throw new Error("Internal error: `Template->render` was removed in Eleventy 3.0.");
	}

	// Tests only
	async renderLayout() {
		throw new Error("Internal error: `Template->renderLayout` was removed in Eleventy 3.0.");
	}

	async renderDirect(str, data, bypassMarkdown) {
		return super.render(str, data, bypassMarkdown);
	}

	// This is the primary render mechanism, called via TemplateMap->populateContentDataInMap
	async renderPageEntryWithoutLayout(pageEntry) {
		// @cachedproperty
		if (!this._cacheRenderedPromise) {
			this._cacheRenderedPromise = this.renderDirect(pageEntry.rawInput, pageEntry.data);
			this.renderCount++;
		}

		return this._cacheRenderedPromise;
	}

	setLinters(linters) {
		if (!isPlainObject(linters)) {
			throw new Error("Object expected in setLinters");
		}
		// this acts as a reset
		this.linters = [];
		for (let linter of Object.values(linters).filter((l) => typeof l === "function")) {
			this.addLinter(linter);
		}
	}

	addLinter(callback) {
		this.linters.push(callback);
	}

	async runLinters(str, page) {
		let { inputPath, outputPath, url } = page;
		let pageData = page.data.page;

		for (let linter of this.linters) {
			// these can be asynchronous but no guarantee of order when they run
			linter.call(
				{
					inputPath,
					outputPath,
					url,
					page: pageData,
				},
				str,
				inputPath,
				outputPath,
			);
		}
	}

	setTransforms(transforms) {
		if (!isPlainObject(transforms)) {
			throw new Error("Object expected in setTransforms");
		}
		this.transforms = transforms;
	}

	async runTransforms(str, pageEntry) {
		return TransformsUtil.runAll(str, pageEntry.data.page, this.transforms, {
			logger: this.logger,
		});
	}

	_addComputedEntry(computedData, obj, parentKey, declaredDependencies) {
		// this check must come before isPlainObject
		if (typeof obj === "function") {
			computedData.add(parentKey, obj, declaredDependencies);
		} else if (Array.isArray(obj)) {
			// Arrays are treated as one entry in the dependency graph now
			computedData.addTemplateString(
				parentKey,
				async function (innerData) {
					return Promise.all(
						obj.map((entry) => {
							if (typeof entry === "string") {
								return this.tmpl.renderComputedData(entry, innerData);
							}
							return entry;
						}),
					);
				},
				declaredDependencies,
				this.getParseForSymbolsFunction(obj),
				this,
			);
		} else if (isPlainObject(obj)) {
			for (let key in obj) {
				let keys = [];
				if (parentKey) {
					keys.push(parentKey);
				}
				keys.push(key);
				this._addComputedEntry(computedData, obj[key], keys.join("."), declaredDependencies);
			}
		} else if (typeof obj === "string") {
			computedData.addTemplateString(
				parentKey,
				async function (innerData) {
					return this.tmpl.renderComputedData(obj, innerData);
				},
				declaredDependencies,
				this.getParseForSymbolsFunction(obj),
				this,
			);
		} else {
			// Numbers, booleans, etc
			computedData.add(parentKey, obj, declaredDependencies);
		}
	}

	async addComputedData(data) {
		if (isPlainObject(data?.[this.config.keys.computed])) {
			this.computedData = new ComputedData(this.config);

			// Note that `permalink` is only a thing that gets consumed—it does not go directly into generated data
			// this allows computed entries to use page.url or page.outputPath and they’ll be resolved properly

			// TODO Room for optimization here—we don’t need to recalculate `getOutputHref` and `getOutputPath`
			// TODO Why are these using addTemplateString instead of add
			this.computedData.addTemplateString(
				"page.url",
				async function (data) {
					return this.tmpl.getOutputHref(data);
				},
				data.permalink ? ["permalink"] : undefined,
				false, // skip symbol resolution
				this,
			);

			this.computedData.addTemplateString(
				"page.outputPath",
				async function (data) {
					return this.tmpl.getOutputPath(data);
				},
				data.permalink ? ["permalink"] : undefined,
				false, // skip symbol resolution
				this,
			);

			// Check for reserved properties in computed data
			if (this.config.freezeReservedData) {
				ReservedData.check(data[this.config.keys.computed]);
			}

			// actually add the computed data
			this._addComputedEntry(this.computedData, data[this.config.keys.computed]);

			// limited run of computed data—save the stuff that relies on collections for later.
			debug("First round of computed data for %o", this.inputPath);
			await this.computedData.setupData(data, function (entry) {
				return !this.isUsesStartsWith(entry, "collections.");

				// TODO possible improvement here is to only process page.url, page.outputPath, permalink
				// instead of only punting on things that rely on collections.
				// let firstPhaseComputedData = ["page.url", "page.outputPath", ...this.getOrderFor("page.url"), ...this.getOrderFor("page.outputPath")];
				// return firstPhaseComputedData.indexOf(entry) > -1;
			});
		} else {
			if (!("page" in data)) {
				data.page = {};
			}

			// pagination will already have these set via Pagination->getPageTemplates
			if (data.page.url && data.page.outputPath) {
				return;
			}

			let { href, path } = await this.getOutputLocations(data);
			data.page.url = href;
			data.page.outputPath = path;
		}
	}

	// Computed data consuming collections!
	async resolveRemainingComputedData(data) {
		// If it doesn’t exist, computed data is not used for this template
		if (this.computedData) {
			debug("Second round of computed data for %o", this.inputPath);
			return this.computedData.processRemainingData(data);
		}
	}

	static augmentWithTemplateContentProperty(obj) {
		return Object.defineProperties(obj, {
			needsCheck: {
				enumerable: false,
				writable: true,
				value: true,
			},
			_templateContent: {
				enumerable: false,
				writable: true,
				value: undefined,
			},
			templateContent: {
				enumerable: true,
				set(content) {
					if (content === undefined) {
						this.needsCheck = false;
					}
					this._templateContent = content;
				},
				get() {
					if (this.needsCheck && this._templateContent === undefined) {
						if (this.template.isRenderable()) {
							// should at least warn here
							throw new TemplateContentPrematureUseError(
								`Tried to use templateContent too early on ${this.inputPath}${
									this.pageNumber ? ` (page ${this.pageNumber})` : ""
								}`,
							);
						} else {
							throw new TemplateContentUnrenderedTemplateError(
								`Tried to use templateContent on unrendered template: ${
									this.inputPath
								}${this.pageNumber ? ` (page ${this.pageNumber})` : ""}`,
							);
						}
					}
					return this._templateContent;
				},
			},
			// Alias for templateContent for consistency
			content: {
				enumerable: true,
				get() {
					return this.templateContent;
				},
				set() {
					throw new Error("Setter not available for `content`. Use `templateContent` instead.");
				},
			},
		});
	}

	static async runPreprocessors(inputPath, content, data, preprocessors) {
		let skippedVia = false;
		for (let [name, preprocessor] of Object.entries(preprocessors)) {
			let { filter, callback } = preprocessor;

			let filters;
			if (Array.isArray(filter)) {
				filters = filter;
			} else if (typeof filter === "string") {
				filters = filter.split(",");
			} else {
				throw new Error(
					`Expected file extensions passed to "${name}" content preprocessor to be a string or array. Received: ${filter}`,
				);
			}

			filters = filters.map((extension) => {
				if (extension.startsWith(".") || extension === "*") {
					return extension;
				}

				return `.${extension}`;
			});

			if (!filters.some((extension) => extension === "*" || inputPath.endsWith(extension))) {
				// skip
				continue;
			}

			try {
				let ret = await callback.call(
					{
						inputPath,
					},
					data,
					content,
				);

				// Returning explicit false is the same as ignoring the template
				if (ret === false) {
					skippedVia = name;
					continue;
				}

				// Different from transforms: returning falsy (not false) here does nothing (skips the preprocessor)
				if (ret) {
					content = ret;
				}
			} catch (e) {
				throw new EleventyBaseError(
					`Preprocessor \`${name}\` encountered an error when transforming ${inputPath}.`,
					e,
				);
			}
		}

		return {
			skippedVia,
			content,
		};
	}

	async getTemplates(data) {
		let content = await this.getPreRender();
		let { skippedVia, content: rawInput } = await Template.runPreprocessors(
			this.inputPath,
			content,
			data,
			this.config.preprocessors,
		);

		if (skippedVia) {
			debug(
				"Skipping %o, the %o preprocessor returned an explicit `false`",
				this.inputPath,
				skippedVia,
			);
			return [];
		}

		// Raw Input *includes* preprocessor modifications
		// https://github.com/11ty/eleventy/issues/1206
		data.page.rawInput = rawInput;

		if (!Pagination.hasPagination(data)) {
			await this.addComputedData(data);

			let obj = {
				template: this, // not on the docs but folks are relying on it
				rawInput,
				groupNumber: 0, // i18n plugin
				data,

				page: data.page,
				inputPath: this.inputPath,
				fileSlug: this.fileSlugStr,
				filePathStem: this.filePathStem,
				date: data.page.date,
				outputPath: data.page.outputPath,
				url: data.page.url,
			};

			obj = Template.augmentWithTemplateContentProperty(obj);

			return [obj];
		} else {
			// needs collections for pagination items
			// but individual pagination entries won’t be part of a collection
			this.paging = new Pagination(this, data, this.config);

			let pageTemplates = await this.paging.getPageTemplates();
			let objects = [];

			for (let pageEntry of pageTemplates) {
				await pageEntry.template.addComputedData(pageEntry.data);

				let obj = {
					template: pageEntry.template, // not on the docs but folks are relying on it
					rawInput,
					pageNumber: pageEntry.pageNumber,
					groupNumber: pageEntry.groupNumber || 0,

					data: pageEntry.data,

					inputPath: this.inputPath,
					fileSlug: this.fileSlugStr,
					filePathStem: this.filePathStem,

					page: pageEntry.data.page,
					date: pageEntry.data.page.date,
					outputPath: pageEntry.data.page.outputPath,
					url: pageEntry.data.page.url,
				};

				obj = Template.augmentWithTemplateContentProperty(obj);

				objects.push(obj);
			}

			return objects;
		}
	}

	async _write({ url, outputPath, data, rawInput }, finalContent) {
		let lang = {
			start: "Writing",
			finished: "written",
		};

		if (!this.isDryRun) {
			if (this.logger.isLoggingEnabled()) {
				let isVirtual = this.isVirtualTemplate();
				let tr = await this.getTemplateRender();
				let engineList = tr.getReadableEnginesListDifferingFromFileExtension();
				let suffix = `${isVirtual ? " (virtual)" : ""}${engineList ? ` (${engineList})` : ""}`;
				this.logger.log(
					`${lang.start} ${outputPath} ${chalk.gray(`from ${this.inputPath}${suffix}`)}`,
				);
			}
		} else if (this.isDryRun) {
			return;
		}

		let templateBenchmarkDir = this.bench.get("Template make parent directory");
		templateBenchmarkDir.before();

		if (this.eleventyConfig.templateHandling?.writeMode === "async") {
			await this.fsManager.createDirectoryForFile(outputPath);
		} else {
			this.fsManager.createDirectoryForFileSync(outputPath);
		}

		templateBenchmarkDir.after();

		if (!Buffer.isBuffer(finalContent) && typeof finalContent !== "string") {
			throw new Error(
				`The return value from the render function for the ${this.engine.name} template was not a String or Buffer. Received ${finalContent}`,
			);
		}

		let templateBenchmark = this.bench.get("Template Write");
		templateBenchmark.before();

		if (this.eleventyConfig.templateHandling?.writeMode === "async") {
			await this.fsManager.writeFile(outputPath, finalContent);
		} else {
			this.fsManager.writeFileSync(outputPath, finalContent);
		}

		templateBenchmark.after();
		this.writeCount++;
		debug(`${outputPath} ${lang.finished}.`);

		let ret = {
			inputPath: this.inputPath,
			outputPath: outputPath,
			url,
			content: finalContent,
			rawInput,
		};

		if (data && this.config.dataFilterSelectors?.size > 0) {
			ret.data = this.retrieveDataForJsonOutput(data, this.config.dataFilterSelectors);
		}

		return ret;
	}

	async #renderPageEntryWithLayoutsAndTransforms(pageEntry) {
		let content;
		let layoutKey = pageEntry.data[this.config.keys.layout];
		if (this.engine.useLayouts() && layoutKey) {
			let layout = pageEntry.template.getLayout(layoutKey);
			content = await layout.renderPageEntry(pageEntry);
		} else {
			content = pageEntry.templateContent;
		}

		await this.runLinters(content, pageEntry);

		content = await this.runTransforms(content, pageEntry);
		return content;
	}

	async renderPageEntry(pageEntry) {
		// @cachedproperty
		if (!pageEntry.template._cacheRenderedTransformsAndLayoutsPromise) {
			pageEntry.template._cacheRenderedTransformsAndLayoutsPromise =
				this.#renderPageEntryWithLayoutsAndTransforms(pageEntry);
		}

		return pageEntry.template._cacheRenderedTransformsAndLayoutsPromise;
	}

	retrieveDataForJsonOutput(data, selectors) {
		let filtered = {};
		for (let selector of selectors) {
			let value = lodashGet(data, selector);
			lodashSet(filtered, selector, value);
		}
		return filtered;
	}

	async generateMapEntry(mapEntry, to) {
		let ret = [];

		for (let page of mapEntry._pages) {
			let content;

			// Note that behavior.render is overridden when using json or ndjson output
			if (page.template.isRenderable()) {
				// this reuses page.templateContent, it doesn’t render it
				content = await page.template.renderPageEntry(page);
			}

			if (to === "json" || to === "ndjson") {
				let obj = {
					url: page.url,
					inputPath: page.inputPath,
					outputPath: page.outputPath,
					rawInput: page.rawInput,
					content: content,
				};

				if (this.config.dataFilterSelectors?.size > 0) {
					obj.data = this.retrieveDataForJsonOutput(page.data, this.config.dataFilterSelectors);
				}

				if (to === "ndjson") {
					let jsonString = JSON.stringify(obj);
					this.logger.toStream(jsonString + os.EOL);
					continue;
				}

				// json
				ret.push(obj);
				continue;
			}

			if (!page.template.isRenderable()) {
				debug("Template not written %o from %o.", page.outputPath, page.template.inputPath);
				continue;
			}

			if (!page.template.behavior.isWriteable()) {
				debug(
					"Template not written %o from %o (via permalink: false, permalink.build: false, or a permalink object without a build property).",
					page.outputPath,
					page.template.inputPath,
				);
				continue;
			}

			// compile returned undefined
			if (content !== undefined) {
				ret.push(this._write(page, content));
			}
		}

		return Promise.all(ret);
	}

	async clone() {
		// TODO do we need to even run the constructor here or can we simplify it even more
		let tmpl = new Template(
			this.inputPath,
			this.templateData,
			this.extensionMap,
			this.eleventyConfig,
		);

		// We use this cheap property setter below instead
		// await tmpl.getTemplateRender();

		// preserves caches too, e.g. _frontMatterDataCache
		// Does not yet include .computedData
		for (let key in this) {
			tmpl[key] = this[key];
		}

		return tmpl;
	}

	getWriteCount() {
		return this.writeCount;
	}

	getRenderCount() {
		return this.renderCount;
	}

	async getInputFileStat() {
		// @cachedproperty
		if (!this._stats) {
			this._stats = fsStat(this.inputPath);
		}

		return this._stats;
	}

	async _getDateInstance(key = "birthtimeMs") {
		let stat = await this.getInputFileStat();

		// Issue 1823: https://github.com/11ty/eleventy/issues/1823
		// return current Date in a Lambda
		// otherwise ctime would be "1980-01-01T00:00:00.000Z"
		// otherwise birthtime would be "1970-01-01T00:00:00.000Z"
		if (stat.birthtimeMs === 0) {
			return new Date();
		}

		let newDate = new Date(stat[key]);

		debug(
			"Template date: using file’s %o for %o of %o (from %o)",
			key,
			this.inputPath,
			newDate,
			stat.birthtimeMs,
		);

		return newDate;
	}

	async getMappedDate(data) {
		let dateValue = data?.date;

		// These can return a Date object, or a string.
		// Already type checked to be functions in UserConfig
		for (let fn of this.config.customDateParsing) {
			let ret = fn.call(
				{
					page: data.page,
				},
				dateValue,
			);

			if (ret) {
				debug("getMappedDate: date value override via `addDateParsing` callback to %o", ret);
				dateValue = ret;
			}
		}

		if (dateValue) {
			debug("getMappedDate: using a date in the data for %o of %o", this.inputPath, data.date);
			if (dateValue?.constructor?.name === "DateTime") {
				// YAML does its own date parsing
				debug("getMappedDate: found DateTime instance: %o", dateValue);
				return dateValue.toJSDate();
			}

			if (dateValue instanceof Date) {
				// YAML does its own date parsing
				debug("getMappedDate: found Date instance (maybe from YAML): %o", dateValue);
				return dateValue;
			}

			// special strings
			if (!this.isVirtualTemplate()) {
				if (dateValue.toLowerCase() === "git last modified") {
					let d = await getDateFromGitLastUpdated(this.inputPath);
					if (d) {
						return d;
					}

					// return now if this file is not yet available in `git`
					return new Date();
				}
				if (dateValue.toLowerCase() === "last modified") {
					return this._getDateInstance("ctimeMs");
				}
				if (dateValue.toLowerCase() === "git created") {
					let d = await getDateFromGitFirstAdded(this.inputPath);
					if (d) {
						return d;
					}

					// return now if this file is not yet available in `git`
					return new Date();
				}
				if (dateValue.toLowerCase() === "created") {
					return this._getDateInstance("birthtimeMs");
				}
			}

			// try to parse with Luxon
			let date = DateTime.fromISO(dateValue, { zone: "utc" });
			if (!date.isValid) {
				throw new Error(
					`Data cascade value for \`date\` (${dateValue}) is invalid for ${this.inputPath}`,
				);
			}
			debug("getMappedDate: Luxon parsed %o: %o and %o", dateValue, date, date.toJSDate());

			return date.toJSDate();
		}

		// No Date supplied in the Data Cascade, try to find the date in the file name
		let filepathRegex = this.inputPath.match(/(\d{4}-\d{2}-\d{2})/);
		if (filepathRegex !== null) {
			// if multiple are found in the path, use the first one for the date
			let dateObj = DateTime.fromISO(filepathRegex[1], {
				zone: "utc",
			}).toJSDate();
			debug(
				"getMappedDate: using filename regex time for %o of %o: %o",
				this.inputPath,
				filepathRegex[1],
				dateObj,
			);
			return dateObj;
		}

		// No Date supplied in the Data Cascade
		if (this.isVirtualTemplate()) {
			return new Date();
		}

		return this._getDateInstance("birthtimeMs");
	}

	// Important reminder: Template data is first generated in TemplateMap
	async getTemplateMapEntries(data) {
		debugDev("%o getMapped()", this.inputPath);

		this.behavior.setRenderViaDataCascade(data);

		let entries = [];
		// does not return outputPath or url, we don’t want to render permalinks yet
		entries.push({
			template: this,
			inputPath: this.inputPath,
			data,
		});

		return entries;
	}
}

export default Template;
