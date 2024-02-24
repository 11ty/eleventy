import { TemplatePath } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import TemplateLayoutPathResolver from "./TemplateLayoutPathResolver.js";
import TemplateContent from "./TemplateContent.js";
import TemplateData from "./TemplateData.js";
import templateCache from "./TemplateCache.js";

// const debug = debugUtil("Eleventy:TemplateLayout");
const debugDev = debugUtil("Dev:Eleventy:TemplateLayout");

class TemplateLayout extends TemplateContent {
	constructor(key, inputDir, extensionMap, eleventyConfig) {
		if (!eleventyConfig) {
			throw new Error("Expected `eleventyConfig` in TemplateLayout constructor.");
		}

		const resolver = new TemplateLayoutPathResolver(key, inputDir, extensionMap, eleventyConfig);
		const resolvedPath = resolver.getFullPath();

		super(resolvedPath, inputDir, eleventyConfig);

		if (!extensionMap) {
			throw new Error("Expected `extensionMap` in TemplateLayout constructor.");
		}

		this.extensionMap = extensionMap;
		this.key = resolver.getNormalizedLayoutKey();
		this.dataKeyLayoutPath = key;
		this.inputPath = resolvedPath;
		this.inputDir = inputDir;
	}

	getKey() {
		return this.key;
	}

	getFullKey() {
		return TemplateLayout.resolveFullKey(this.dataKeyLayoutPath, this.inputDir);
	}

	getCacheKeys() {
		return new Set([this.dataKeyLayoutPath, this.getFullKey(), this.key]);
	}

	static resolveFullKey(key, inputDir) {
		return TemplatePath.join(inputDir, key);
	}

	static getTemplate(key, inputDir, eleventyConfig, extensionMap) {
		const config = eleventyConfig.getConfig();
		if (!config.useTemplateCache) {
			return new TemplateLayout(key, inputDir, extensionMap, eleventyConfig);
		}

		const fullKey = TemplateLayout.resolveFullKey(key, inputDir);
		if (!templateCache.has(fullKey)) {
			const layout = new TemplateLayout(key, inputDir, extensionMap, eleventyConfig);

			templateCache.add(layout);
			debugDev("Added %o to TemplateCache", key);

			return layout;
		}

		return templateCache.get(fullKey);
	}

	async getTemplateLayoutMapEntry() {
		return {
			// Used by `TemplateLayout.getTemplate()`
			key: this.dataKeyLayoutPath,
			inputDir: this.inputDir,

			// used by `this.getData()`
			frontMatterData: await this.getFrontMatterData(),
		};
	}

	async getTemplateLayoutMap() {
		if (!this.cachedLayoutMap) {
			this.cachedLayoutMap = new Promise(async (resolve, reject) => {
				try {
					// For both the eleventy.layouts event and cyclical layout chain checking  (e.g., a => b => c => a)
					const layoutChain = new Set();
					layoutChain.add(this.inputPath);

					const cfgKey = this.config.keys.layout;
					const map = [];
					let mapEntry = await this.getTemplateLayoutMapEntry();

					map.push(mapEntry);

					while (mapEntry.frontMatterData && cfgKey in mapEntry.frontMatterData) {
						// Layout of the current layout
						const parentLayoutKey = mapEntry.frontMatterData[cfgKey];

						const layout = TemplateLayout.getTemplate(
							parentLayoutKey,
							mapEntry.inputDir,
							this.eleventyConfig,
							this.extensionMap,
						);

						// Abort if a circular layout chain is detected. Otherwise, we'll time out and run out of memory.
						if (layoutChain.has(layout.inputPath)) {
							throw new Error(
								`Your layouts have a circular reference, starting at ${map[0].key}! The layout at ${layout.inputPath} was specified twice in this layout chain.`,
							);
						}

						// Keep track of this layout so we can detect duplicates in subsequent iterations
						layoutChain.add(layout.inputPath);

						// reassign for next loop
						mapEntry = await layout.getTemplateLayoutMapEntry();

						map.push(mapEntry);
					}

					this.layoutChain = Array.from(layoutChain);

					resolve(map);
				} catch (e) {
					reject(e);
				}
			});
		}

		return this.cachedLayoutMap;
	}

	async getLayoutChain() {
		if (!Array.isArray(this.layoutChain)) {
			await this.getTemplateLayoutMap();
		}

		return this.layoutChain;
	}

	async getData() {
		if (!this.dataCache) {
			this.dataCache = new Promise(async (resolve, reject) => {
				try {
					const map = await this.getTemplateLayoutMap();
					const dataToMerge = [];
					for (let j = map.length - 1; j >= 0; j--) {
						dataToMerge.push(map[j].frontMatterData);
					}

					// Deep merge of layout front matter
					const data = TemplateData.mergeDeep(this.config, {}, ...dataToMerge);
					delete data[this.config.keys.layout];

					resolve(data);
				} catch (e) {
					reject(e);
				}
			});
		}

		return this.dataCache;
	}

	// Do only cache this layout’s render function and delegate the rest to the other templates.
	async getCachedCompiledLayoutFunction() {
		if (!this.cachedCompiledLayoutFunction) {
			this.cachedCompiledLayoutFunction = new Promise(async (resolve, reject) => {
				try {
					const rawInput = await this.getPreRender();
					const renderFunction = await this.compile(rawInput);
					resolve(renderFunction);
				} catch (e) {
					reject(e);
				}
			});
		}

		return this.cachedCompiledLayoutFunction;
	}

	async getCompiledLayoutFunctions() {
		const layoutMap = await this.getTemplateLayoutMap();
		const fns = [];

		try {
			fns.push({
				render: await this.getCachedCompiledLayoutFunction(),
			});

			if (layoutMap.length > 1) {
				const [, /*currentLayout*/ parentLayout] = layoutMap;
				const { key, inputDir } = parentLayout;

				const layoutTemplate = TemplateLayout.getTemplate(
					key,
					inputDir,
					this.eleventyConfig,
					this.extensionMap,
				);

				// The parent already includes the rest of the layout chain
				const upstreamFns = await layoutTemplate.getCompiledLayoutFunctions();
				for (let j = 0, k = upstreamFns.length; j < k; j++) {
					fns.push(upstreamFns[j]);
				}
			}

			return fns;
		} catch (e) {
			debugDev("Clearing TemplateCache after error.");
			templateCache.clear();
			throw e;
		}
	}

	async render() {
		throw new Error("Internal error: `render` was removed from TemplateLayout.js in Eleventy 3.0.");
	}

	// Inefficient? We want to compile all the templatelayouts into a single reusable callback?
	// Trouble: layouts may need data variables present downstream/upstream
	// This is called from Template->renderPageEntry
	async renderPageEntry(pageEntry) {
		let templateContent = pageEntry.templateContent;
		const compiledFunctions = await this.getCompiledLayoutFunctions();
		for (const { render } of compiledFunctions) {
			const data = {
				content: templateContent,
				...pageEntry.data,
			};

			templateContent = await render(data);
		}

		// Don’t set `templateContent` on pageEntry because collection items should not have layout markup
		return templateContent;
	}

	resetCaches(types) {
		super.resetCaches(types);

		delete this.dataCache;
		delete this.layoutChain;
		delete this.cachedLayoutMap;
		delete this.cachedCompiledLayoutFunction;
	}
}

export default TemplateLayout;
