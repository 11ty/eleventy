/* eslint-disable indent */

import { DepGraph as DependencyGraph } from "dependency-graph";
import { isPlainObject } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import TemplateCollection from "./TemplateCollection.js";
import EleventyErrorUtil from "./EleventyErrorUtil.js";
import UsingCircularTemplateContentReferenceError from "./Errors/UsingCircularTemplateContentReferenceError.js";
import EleventyBaseError from "./EleventyBaseError.js";
import TemplateData from "./TemplateData.js";

const debug = debugUtil("Eleventy:TemplateMap");
const debugDev = debugUtil("Dev:Eleventy:TemplateMap");

class TemplateMapConfigError extends EleventyBaseError {}

class DuplicatePermalinkOutputError extends EleventyBaseError {
	get removeDuplicateErrorStringFromOutput() {
		return true;
	}
}

class TemplateMap {
	constructor(eleventyConfig) {
		if (!eleventyConfig) {
			throw new TemplateMapConfigError("Missing config argument.");
		}
		this.eleventyConfig = eleventyConfig;
		this.map = [];
		this.collectionsData = null;
		this.cached = false;
		this.verboseOutput = true;
		this.collection = new TemplateCollection();
	}

	set userConfig(config) {
		this._userConfig = config;
	}

	get userConfig() {
		if (!this._userConfig) {
			// TODO use this.config for this, need to add collections to mergeable props in userconfig
			this._userConfig = this.eleventyConfig.userConfig;
		}

		return this._userConfig;
	}

	get config() {
		if (!this._config) {
			this._config = this.eleventyConfig.getConfig();
		}
		return this._config;
	}

	static get tagPrefix() {
		return "___TAG___";
	}

	async add(template) {
		if (!template) {
			return;
		}

		// IMPORTANT: This is where the data is first generated for the template
		const data = await template.getData();

		for (const map of await template.getTemplateMapEntries(data)) {
			this.map.push(map);
		}
	}

	getMap() {
		return this.map;
	}

	getTagTarget(str) {
		if (str.startsWith("collections.")) {
			return str.slice("collections.".length);
		}
		// Fixes #2851
		// eslint-disable-next-line quotes
		if (str.startsWith("collections['") || str.startsWith('collections["')) {
			return str.slice("collections['".length, -2);
		}
	}

	/* ---
	 * pagination:
	 *   data: collections
	 * ---
	 */
	isPaginationOverAllCollections(entry) {
		if (entry.data.pagination && entry.data.pagination.data) {
			return (
				entry.data.pagination.data === "collections" ||
				entry.data.pagination.data === "collections.all"
			);
		}
	}

	getPaginationTagTarget(entry) {
		if (entry.data.pagination && entry.data.pagination.data) {
			return this.getTagTarget(entry.data.pagination.data);
		}
	}

	addTagsToGraph(graph, inputPath, tags) {
		if (!Array.isArray(tags)) {
			return;
		}
		for (const tag of tags) {
			const tagWithPrefix = TemplateMap.tagPrefix + tag;
			if (!graph.hasNode(tagWithPrefix)) {
				graph.addNode(tagWithPrefix);
			}

			// Populates to collections.tagName
			// Dependency from tag to inputPath
			graph.addDependency(tagWithPrefix, inputPath);
		}
	}

	addDeclaredDependenciesToGraph(graph, inputPath, deps) {
		if (!Array.isArray(deps)) {
			return;
		}

		for (const tag of deps) {
			const tagWithPrefix = TemplateMap.tagPrefix + tag;
			if (!graph.hasNode(tagWithPrefix)) {
				graph.addNode(tagWithPrefix);
			}

			// Dependency from inputPath to collection/tag
			graph.addDependency(inputPath, tagWithPrefix);
		}
	}

	// Exclude: Pagination templates consuming `collections` or `collections.all`
	// Exclude: Pagination templates that consume config API collections

	// Include: Pagination templates that don’t consume config API collections
	// Include: Templates that don’t use Pagination
	getMappedDependencies() {
		const graph = new DependencyGraph();
		const tagPrefix = TemplateMap.tagPrefix;

		graph.addNode(tagPrefix + "all");

		for (const entry of this.map) {
			if (this.isPaginationOverAllCollections(entry)) {
				continue;
			}

			// using Pagination (but not targeting a user config collection)
			const paginationTagTarget = this.getPaginationTagTarget(entry);
			if (paginationTagTarget) {
				if (this.isUserConfigCollectionName(paginationTagTarget)) {
					// delay this one to the second stage
					continue;
				} else {
					// using pagination but over a tagged collection
					graph.addNode(entry.inputPath);
					if (!graph.hasNode(tagPrefix + paginationTagTarget)) {
						graph.addNode(tagPrefix + paginationTagTarget);
					}
					graph.addDependency(entry.inputPath, tagPrefix + paginationTagTarget);
				}
			} else {
				// not using pagination
				graph.addNode(entry.inputPath);
			}

			const collections = TemplateData.getIncludedCollectionNames(entry.data);
			this.addTagsToGraph(graph, entry.inputPath, collections);

			this.addDeclaredDependenciesToGraph(
				graph,
				entry.inputPath,
				entry.data.eleventyImport?.collections,
			);
		}

		return graph;
	}

	// Exclude: Pagination templates consuming `collections` or `collections.all`
	// Include: Pagination templates that consume config API collections
	getDelayedMappedDependencies() {
		const graph = new DependencyGraph();
		const tagPrefix = TemplateMap.tagPrefix;

		graph.addNode(tagPrefix + "all");

		const userConfigCollections = this.getUserConfigCollectionNames();

		// Add tags from named user config collections
		for (const tag of userConfigCollections) {
			graph.addNode(tagPrefix + tag);
		}

		for (const entry of this.map) {
			if (this.isPaginationOverAllCollections(entry)) {
				continue;
			}

			const paginationTagTarget = this.getPaginationTagTarget(entry);
			if (paginationTagTarget && this.isUserConfigCollectionName(paginationTagTarget)) {
				if (!graph.hasNode(entry.inputPath)) {
					graph.addNode(entry.inputPath);
				}
				graph.addDependency(entry.inputPath, tagPrefix + paginationTagTarget);

				const collections = TemplateData.getIncludedCollectionNames(entry.data);
				this.addTagsToGraph(graph, entry.inputPath, collections);

				this.addDeclaredDependenciesToGraph(
					graph,
					entry.inputPath,
					entry.data.eleventyImport?.collections,
				);
			}
		}

		return graph;
	}

	// Exclude: Pagination templates consuming `collections.all`
	// Include: Pagination templates consuming `collections`
	getPaginatedOverCollectionsMappedDependencies() {
		const graph = new DependencyGraph();
		const tagPrefix = TemplateMap.tagPrefix;
		let allNodeAdded = false;

		for (const entry of this.map) {
			if (this.isPaginationOverAllCollections(entry) && !this.getPaginationTagTarget(entry)) {
				if (!allNodeAdded) {
					graph.addNode(tagPrefix + "all");
					allNodeAdded = true;
				}

				if (!graph.hasNode(entry.inputPath)) {
					graph.addNode(entry.inputPath);
				}

				if (!entry.data.eleventyExcludeFromCollections) {
					// collections.all
					graph.addDependency(tagPrefix + "all", entry.inputPath);

					// Note that `tags` are otherwise ignored here
					// TODO should we throw an error?
				}

				this.addDeclaredDependenciesToGraph(
					graph,
					entry.inputPath,
					entry.data.eleventyImport?.collections,
				);
			}
		}

		return graph;
	}

	// Include: Pagination templates consuming `collections.all`
	getPaginatedOverAllCollectionMappedDependencies() {
		const graph = new DependencyGraph();
		const tagPrefix = TemplateMap.tagPrefix;
		let allNodeAdded = false;

		for (const entry of this.map) {
			if (
				this.isPaginationOverAllCollections(entry) &&
				this.getPaginationTagTarget(entry) === "all"
			) {
				if (!allNodeAdded) {
					graph.addNode(tagPrefix + "all");
					allNodeAdded = true;
				}

				if (!graph.hasNode(entry.inputPath)) {
					graph.addNode(entry.inputPath);
				}

				if (!entry.data.eleventyExcludeFromCollections) {
					// Populates into collections.all
					// This is circular!
					graph.addDependency(tagPrefix + "all", entry.inputPath);

					// Note that `tags` are otherwise ignored here
					// TODO should we throw an error?
				}

				this.addDeclaredDependenciesToGraph(
					graph,
					entry.inputPath,
					entry.data.eleventyImport?.collections,
				);
			}
		}

		return graph;
	}

	getTemplateMapDependencyGraph() {
		return [
			this.getMappedDependencies(),
			this.getDelayedMappedDependencies(),
			this.getPaginatedOverCollectionsMappedDependencies(),
			this.getPaginatedOverAllCollectionMappedDependencies(),
		];
	}

	getFullTemplateMapOrder() {
		// convert dependency graphs to ordered arrays
		return this.getTemplateMapDependencyGraph().map((entry) => entry.overallOrder());
	}

	setupDependencyGraphChangesForIncrementalFile(incrementalFile) {
		if (!incrementalFile) {
			return new Set();
		}

		// Only dependents: things that consume templates that have deleted dependencies, e.g. if index.md consumes collections.post and a file removes its post tag, regenerate index.md
		const newCollectionNames = new Set(); // collections published to
		for (const entry of this.map) {
			if (!entry.data.eleventyExcludeFromCollections) {
				newCollectionNames.add("all");

				if (Array.isArray(entry.data.tags)) {
					for (const tag of entry.data.tags) {
						newCollectionNames.add(tag);
					}
				}
			}
		}

		const deletedCollectionNames = this.config.uses.findCollectionsRemovedFrom(
			incrementalFile,
			newCollectionNames,
		);

		// Delete incremental from the dependency graph so we get fresh entries!
		// This _must_ happen before any additions, the other ones are in Custom.js and GlobalDependencyMap.js (from the eleventy.layouts Event)
		this.config.uses.resetNode(incrementalFile);

		return this.config.uses.getTemplatesThatConsumeCollections(deletedCollectionNames);
	}

	// Similar to getTemplateMapDependencyGraph but adds those relationships to the global dependency graph used for incremental builds
	addToGlobalDependencyGraph() {
		for (const entry of this.map) {
			const paginationTagTarget = this.getPaginationTagTarget(entry);
			if (paginationTagTarget) {
				this.config.uses.addDependencyConsumesCollection(entry.inputPath, paginationTagTarget);
			}

			if (!entry.data.eleventyExcludeFromCollections) {
				this.config.uses.addDependencyPublishesToCollection(entry.inputPath, "all");

				if (Array.isArray(entry.data.tags)) {
					for (const tag of entry.data.tags) {
						this.config.uses.addDependencyPublishesToCollection(entry.inputPath, tag);
					}
				}
			}

			if (Array.isArray(entry.data.eleventyImport?.collections)) {
				for (const tag of entry.data.eleventyImport.collections) {
					this.config.uses.addDependencyConsumesCollection(entry.inputPath, tag);
				}
			}
		}
	}

	async setCollectionByTagName(tagName) {
		if (this.isUserConfigCollectionName(tagName)) {
			// async
			this.collectionsData[tagName] = await this.getUserConfigCollection(tagName);
		} else {
			this.collectionsData[tagName] = this.getTaggedCollection(tagName);
		}

		const precompiled = this.config.precompiledCollections;
		if (precompiled && precompiled[tagName]) {
			if (
				tagName === "all" ||
				!Array.isArray(this.collectionsData[tagName]) ||
				this.collectionsData[tagName].length === 0
			) {
				this.collectionsData[tagName] = precompiled[tagName];
			}
		}
	}

	// TODO(slightlyoff): major bottleneck
	async initDependencyMap(dependencyMap) {
		const tagPrefix = TemplateMap.tagPrefix;
		for (const depEntry of dependencyMap) {
			if (depEntry.startsWith(tagPrefix)) {
				// is a tag (collection) entry
				const tagName = depEntry.slice(tagPrefix.length);
				await this.setCollectionByTagName(tagName);
			} else {
				// is a template entry
				const map = this.getMapEntryForInputPath(depEntry);
				map._pages = await map.template.getTemplates(map.data);

				if (map._pages.length === 0) {
					// Reminder: a serverless code path was removed here.
				} else {
					let counter = 0;
					for (const page of map._pages) {
						// Copy outputPath to map entry
						if (!map.outputPath) {
							map.outputPath = page.outputPath;
						}

						if (
							counter === 0 ||
							(map.data.pagination && map.data.pagination.addAllPagesToCollections)
						) {
							if (map.data.eleventyExcludeFromCollections !== true) {
								// TODO do we need .template in collection entries?
								this.collection.add(page);
							}
						}
						counter++;
					}
				}
			}
		}
	}

	async cache() {
		debug("Caching collections objects.");
		this.collectionsData = {};

		for (const entry of this.map) {
			entry.data.collections = this.collectionsData;
		}

		const [dependencyMap, delayedDependencyMap, firstPaginatedDepMap, secondPaginatedDepMap] =
			this.getFullTemplateMapOrder();

		await this.initDependencyMap(dependencyMap);
		await this.initDependencyMap(delayedDependencyMap);
		await this.initDependencyMap(firstPaginatedDepMap);
		await this.initDependencyMap(secondPaginatedDepMap);

		await this.resolveRemainingComputedData();

		const orderedPaths = this.getOrderedInputPaths(
			dependencyMap,
			delayedDependencyMap,
			firstPaginatedDepMap,
			secondPaginatedDepMap,
		);

		const orderedMap = orderedPaths.map((inputPath) => {
			return this.getMapEntryForInputPath(inputPath);
		});

		await this.config.events.emitLazy("eleventy.contentMap", () => {
			return {
				inputPathToUrl: this.generateInputUrlContentMap(orderedMap),
				urlToInputPath: this.generateUrlMap(orderedMap),
			};
		});

		await this.populateContentDataInMap(orderedMap);

		this.populateCollectionsWithContent();
		this.cached = true;

		this.checkForDuplicatePermalinks();

		await this.config.events.emitLazy("eleventy.layouts", () => this.generateLayoutsMap());
	}

	generateInputUrlContentMap(orderedMap) {
		const entries = {};
		for (const entry of orderedMap) {
			entries[entry.inputPath] = entry._pages.map((entry) => entry.url);
		}
		return entries;
	}

	generateUrlMap(orderedMap) {
		const entries = {};
		for (const entry of orderedMap) {
			for (const page of entry._pages) {
				// duplicate urls throw an error, so we can return non array here
				entries[page.url] = {
					inputPath: entry.inputPath,
					groupNumber: page.groupNumber,
				};
			}
		}
		return entries;
	}

	// TODO(slightlyoff): hot inner loop?
	getMapEntryForInputPath(inputPath) {
		for (const map of this.map) {
			if (map.inputPath === inputPath) {
				return map;
			}
		}
	}

	// Filter out any tag nodes
	getOrderedInputPaths(...maps) {
		const orderedMap = [];
		const tagPrefix = TemplateMap.tagPrefix;

		for (const map of maps) {
			for (const dep of map) {
				if (!dep.startsWith(tagPrefix)) {
					orderedMap.push(dep);
				}
			}
		}
		return orderedMap;
	}

	async populateContentDataInMap(orderedMap) {
		const usedTemplateContentTooEarlyMap = [];
		for (const map of orderedMap) {
			if (!map._pages) {
				throw new Error(`Content pages not found for ${map.inputPath}`);
			}

			if (!map.template.behavior.isRenderable()) {
				// Note that empty pagination templates will be skipped here as not renderable
				continue;
			}

			// IMPORTANT: this is where template content is rendered
			try {
				for (const pageEntry of map._pages) {
					pageEntry.templateContent =
						await pageEntry.template.renderPageEntryWithoutLayout(pageEntry);
				}
			} catch (e) {
				if (EleventyErrorUtil.isPrematureTemplateContentError(e)) {
					usedTemplateContentTooEarlyMap.push(map);
				} else {
					throw e;
				}
			}
			debugDev("Added this.map[...].templateContent, outputPath, et al for one map entry");
		}

		for (const map of usedTemplateContentTooEarlyMap) {
			try {
				for (const pageEntry of map._pages) {
					pageEntry.templateContent =
						await pageEntry.template.renderPageEntryWithoutLayout(pageEntry);
				}
			} catch (e) {
				if (EleventyErrorUtil.isPrematureTemplateContentError(e)) {
					throw new UsingCircularTemplateContentReferenceError(
						`${map.inputPath} contains a circular reference (using collections) to its own templateContent.`,
					);
				} else {
					// rethrow?
					throw e;
				}
			}
		}
	}

	_testGetAllTags() {
		const allTags = {};
		for (const map of this.map) {
			const tags = map.data.tags;
			if (Array.isArray(tags)) {
				for (const tag of tags) {
					allTags[tag] = true;
				}
			}
		}
		return Object.keys(allTags);
	}

	getTaggedCollection(tag) {
		let result;
		if (!tag || tag === "all") {
			result = this.collection.getAllSorted();
		} else {
			result = this.collection.getFilteredByTag(tag);
		}
		debug(`Collection: collections.${tag || "all"} size: ${result.length}`);

		return result;
	}

	async _testGetTaggedCollectionsData() {
		const collections = {};
		collections.all = this.collection.getAllSorted();
		debug(`Collection: collections.all size: ${collections.all.length}`);

		const tags = this._testGetAllTags();
		for (const tag of tags) {
			collections[tag] = this.collection.getFilteredByTag(tag);
			debug(`Collection: collections.${tag} size: ${collections[tag].length}`);
		}
		return collections;
	}

	/* 3.0.0-alpha.1: setUserConfigCollections method removed (was only used for testing) */
	isUserConfigCollectionName(name) {
		const collections = this.userConfig.getCollections();
		return name && !!collections[name];
	}

	getUserConfigCollectionNames() {
		return Object.keys(this.userConfig.getCollections());
	}

	async getUserConfigCollection(name) {
		const configCollections = this.userConfig.getCollections();

		// This works with async now
		const result = await configCollections[name](this.collection);

		debug(`Collection: collections.${name} size: ${result.length}`);
		return result;
	}

	async _testGetUserConfigCollectionsData() {
		const collections = {};
		const configCollections = this.userConfig.getCollections();

		for (const name in configCollections) {
			collections[name] = configCollections[name](this.collection);

			debug(`Collection: collections.${name} size: ${collections[name].length}`);
		}

		return collections;
	}

	async _testGetAllCollectionsData() {
		const collections = {};
		const taggedCollections = await this._testGetTaggedCollectionsData();
		Object.assign(collections, taggedCollections);

		const userConfigCollections = await this._testGetUserConfigCollectionsData();
		Object.assign(collections, userConfigCollections);

		return collections;
	}

	populateCollectionsWithContent() {
		for (const collectionName in this.collectionsData) {
			// skip custom collections set in configuration files that have arbitrary types
			if (!Array.isArray(this.collectionsData[collectionName])) {
				continue;
			}

			for (const item of this.collectionsData[collectionName]) {
				// skip custom collections set in configuration files that have arbitrary types
				if (!isPlainObject(item) || !("inputPath" in item)) {
					continue;
				}

				const entry = this.getMapEntryForInputPath(item.inputPath);
				// This check skips precompiled collections
				if (entry) {
					const index = item.pageNumber || 0;
					const content = entry._pages[index]._templateContent;
					if (content !== undefined) {
						item.templateContent = content;
					}
				}
			}
		}
	}

	async resolveRemainingComputedData() {
		const promises = [];
		for (const entry of this.map) {
			for (const pageEntry of entry._pages) {
				if (this.config.keys.computed in pageEntry.data) {
					promises.push(await pageEntry.template.resolveRemainingComputedData(pageEntry.data));
				}
			}
		}
		return Promise.all(promises);
	}

	async generateLayoutsMap() {
		const layouts = {};

		for (const entry of this.map) {
			for (const page of entry._pages) {
				const tmpl = page.template;
				const layoutKey = page.data[this.config.keys.layout];
				if (layoutKey) {
					const layout = tmpl.getLayout(layoutKey);
					const layoutChain = await layout.getLayoutChain();
					const priors = [];
					for (const filepath of layoutChain) {
						if (!layouts[filepath]) {
							layouts[filepath] = new Set();
						}
						layouts[filepath].add(page.inputPath);
						for (const prior of priors) {
							layouts[filepath].add(prior);
						}
						priors.push(filepath);
					}
				}
			}
		}

		for (const key in layouts) {
			layouts[key] = Array.from(layouts[key]);
		}

		return layouts;
	}

	checkForDuplicatePermalinks() {
		const permalinks = {};
		const warnings = {};
		for (const entry of this.map) {
			for (const page of entry._pages) {
				if (page.outputPath === false || page.url === false) {
					// do nothing (also serverless)
				} else if (!permalinks[page.outputPath]) {
					permalinks[page.outputPath] = [entry.inputPath];
				} else {
					warnings[page.outputPath] = `Output conflict: multiple input files are writing to \`${
						page.outputPath
					}\`. Use distinct \`permalink\` values to resolve this conflict.
  1. ${entry.inputPath}
${permalinks[page.outputPath]
	.map(function (inputPath, index) {
		return `  ${index + 2}. ${inputPath}\n`;
	})
	.join("")}
`;

					permalinks[page.outputPath].push(entry.inputPath);
				}
			}
		}

		const warningList = Object.values(warnings);
		if (warningList.length) {
			// throw one at a time
			throw new DuplicatePermalinkOutputError(warningList[0]);
		}
	}

	async _testGetCollectionsData() {
		if (!this.cached) {
			await this.cache();
		}

		return this.collectionsData;
	}
}

export default TemplateMap;
