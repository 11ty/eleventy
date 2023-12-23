import { DepGraph } from "dependency-graph";
import debugUtil from "debug";

import PathNormalizer from "./Util/PathNormalizer.js";

const debug = debugUtil("Eleventy:Dependencies");

class GlobalDependencyMap {
	// dependency-graph requires these keys to be alphabetic strings
	static LAYOUT_KEY = "layout";
	static COLLECTION_PREFIX = "__collection:";

	reset() {
		this._map = undefined;
	}

	setConfig(config) {
		if (this.config) {
			return;
		}

		this.config = config;

		// These have leading dot slashes, but so do the paths from Eleventy
		this.config.events.once("eleventy.layouts", (layouts) => {
			this.addLayoutsToMap(layouts);
		});
	}

	removeLayoutNodes(normalizedLayouts) {
		let nodes = this.map.overallOrder();
		for (let node of nodes) {
			let data = this.map.getNodeData(node);
			if (!data || !data.type || data.type !== GlobalDependencyMap.LAYOUT_KEY) {
				continue;
			}

			// previous layout is not in the new layout map (no templates are using it)
			if (!normalizedLayouts[node]) {
				this.map.removeNode(node);
			}
			// important: if the layout map changed to have different templates (but was not removed)
			// this is already handled by `resetNode` called via TemplateMap
		}
	}

	// Eleventy Layouts don’t show up in the dependency graph, so we handle those separately
	addLayoutsToMap(layouts) {
		let normalizedLayouts = this.normalizeLayoutsObject(layouts);
		// Clear out any previous layout relationships to make way for the new ones
		this.removeLayoutNodes(normalizedLayouts);

		for (let layout in normalizedLayouts) {
			// We add this pre-emptively to add the `layout` data
			if (!this.map.hasNode(layout)) {
				this.map.addNode(layout, {
					type: GlobalDependencyMap.LAYOUT_KEY,
				});
			}

			// Potential improvement: only add the first template in the chain for a template and manage any upstream layouts by their own relationships
			for (let pageTemplate of normalizedLayouts[layout]) {
				this.addDependency(pageTemplate, [layout]);
			}
		}
	}

	get map() {
		if (!this._map) {
			this._map = new DepGraph({ circular: true });
		}

		return this._map;
	}

	set map(graph) {
		this._map = graph;
	}

	normalizeNode(node) {
		if (!node) {
			return;
		}

		// TODO tests for this
		// Fix URL objects passed in (sass does this)
		if (typeof node !== "string" && "toString" in node) {
			node = node.toString();
		}

		if (typeof node !== "string") {
			throw new Error("`addDependencies` files must be strings. Received:" + node);
		}

		return PathNormalizer.fullNormalization(node);
	}

	normalizeLayoutsObject(layouts) {
		let o = {};
		for (let rawLayout in layouts) {
			let layout = this.normalizeNode(rawLayout);
			o[layout] = layouts[rawLayout].map((entry) => this.normalizeNode(entry));
		}
		return o;
	}

	getDependantsFor(node) {
		if (!node) {
			return new Set();
		}

		node = this.normalizeNode(node);

		if (!this.map.hasNode(node)) {
			return new Set();
		}

		// Direct dependants and dependencies, both publish and consume from collections
		return this.map.directDependantsOf(node);
	}

	hasNode(node) {
		return this.map.hasNode(this.normalizeNode(node));
	}

	findCollectionsRemovedFrom(node, collectionNames) {
		if (!this.hasNode(node)) {
			return new Set();
		}

		let prevDeps = this.getDependantsFor(node)
			.filter((entry) => {
				return entry.startsWith(GlobalDependencyMap.COLLECTION_PREFIX);
			})
			.map((entry) => {
				return GlobalDependencyMap.getEntryFromCollectionKey(entry);
			});

		let prevDepsSet = new Set(prevDeps);
		let deleted = new Set();
		for (let dep of prevDepsSet) {
			if (!collectionNames.has(dep)) {
				deleted.add(dep);
			}
		}

		return deleted;
	}

	resetNode(node) {
		node = this.normalizeNode(node);

		if (!this.map.hasNode(node)) {
			return;
		}

		// We don’t want to remove relationships that consume this, controlled by the upstream content
		// for (let dep of this.map.directDependantsOf(node)) {
		//   this.map.removeDependency(dep, node);
		// }

		for (let dep of this.map.directDependenciesOf(node)) {
			this.map.removeDependency(node, dep);
		}
	}

	getTemplatesThatConsumeCollections(collectionNames) {
		let templates = new Set();
		for (let name of collectionNames) {
			let collectionName = GlobalDependencyMap.getCollectionKeyForEntry(name);
			if (!this.map.hasNode(collectionName)) {
				continue;
			}
			for (let node of this.map.dependantsOf(collectionName)) {
				if (!node.startsWith(GlobalDependencyMap.COLLECTION_PREFIX)) {
					templates.add(node);
				}
			}
		}
		return templates;
	}

	getLayoutsUsedBy(node) {
		node = this.normalizeNode(node);

		if (!this.map.hasNode(node)) {
			return [];
		}

		let layouts = [];

		// include self, if layout
		if (this.map.getNodeData(node)?.type === GlobalDependencyMap.LAYOUT_KEY) {
			layouts.push(node);
		}

		this.map.dependantsOf(node).forEach((node) => {
			let data = this.map.getNodeData(node);
			// we only want layouts
			if (data && data.type && data.type === GlobalDependencyMap.LAYOUT_KEY) {
				return layouts.push(node);
			}
		});

		return layouts;
	}

	// Layouts are not relevant to compile cache and can be ignored
	getDependencies(node, includeLayouts = true) {
		node = this.normalizeNode(node);

		// `false` means the Node was unknown
		if (!this.map.hasNode(node)) {
			return false;
		}

		return this.map.dependenciesOf(node).filter((node) => {
			if (includeLayouts) {
				return true;
			}

			// When includeLayouts is `false` we want to filter out layouts
			let data = this.map.getNodeData(node);
			if (data && data.type && data.type === GlobalDependencyMap.LAYOUT_KEY) {
				return false;
			}
			return true;
		});
	}

	// node arguments are already normalized
	_addDependency(from, toArray = []) {
		this.map.addNode(from);

		if (!Array.isArray(toArray)) {
			throw new Error("Second argument to `addDependency` must be an Array.");
		}

		// debug("%o depends on %o", from, toArray);

		for (let to of toArray) {
			if (!this.map.hasNode(to)) {
				this.map.addNode(to);
			}
			if (from !== to) {
				this.map.addDependency(from, to);
			}
		}
	}

	addDependency(from, toArray = []) {
		this._addDependency(
			this.normalizeNode(from),
			toArray.map((to) => this.normalizeNode(to)),
		);
	}

	static getEntryFromCollectionKey(entry) {
		return entry.slice(GlobalDependencyMap.COLLECTION_PREFIX.length);
	}

	static getCollectionKeyForEntry(entry) {
		return `${GlobalDependencyMap.COLLECTION_PREFIX}${entry}`;
	}

	addDependencyConsumesCollection(from, collectionName) {
		let nodeName = this.normalizeNode(from);
		debug("%o depends on collection: %o", nodeName, collectionName);
		this._addDependency(nodeName, [GlobalDependencyMap.getCollectionKeyForEntry(collectionName)]);
	}

	addDependencyPublishesToCollection(from, collectionName) {
		let normalizedFrom = this.normalizeNode(from);
		this._addDependency(GlobalDependencyMap.getCollectionKeyForEntry(collectionName), [
			normalizedFrom,
		]);
	}

	// Layouts are not relevant to compile cache and can be ignored
	hasDependency(from, to, includeLayouts) {
		to = this.normalizeNode(to);

		let deps = this.getDependencies(from, includeLayouts); // normalizes `from`

		if (!deps) {
			return false;
		}

		return deps.includes(to);
	}

	// Layouts are not relevant to compile cache and can be ignored
	isFileRelevantTo(fullTemplateInputPath, comparisonFile, includeLayouts) {
		fullTemplateInputPath = this.normalizeNode(fullTemplateInputPath);
		comparisonFile = this.normalizeNode(comparisonFile);

		// No watch/serve changed file
		if (!comparisonFile) {
			return false;
		}

		// The file that changed is the relevant file
		if (fullTemplateInputPath === comparisonFile) {
			return true;
		}

		// The file that changed is a dependency of the template
		if (this.hasDependency(fullTemplateInputPath, comparisonFile, includeLayouts)) {
			return true;
		}

		return false;
	}

	stringify() {
		return JSON.stringify(this.map);
	}

	restore(persisted) {
		let obj = JSON.parse(persisted);
		let graph = new DepGraph({ circular: true });

		// https://github.com/jriecken/dependency-graph/issues/44
		for (let key in obj) {
			graph[key] = obj[key];
		}
		this.map = graph;
	}
}

export default GlobalDependencyMap;
