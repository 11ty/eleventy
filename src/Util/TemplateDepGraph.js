import { DepGraph as DependencyGraph } from "dependency-graph";

const COLLECTION_PREFIX = "__collection:";

export class TemplateDepGraph extends DependencyGraph {
	static STAGES = ["[basic]", "[userconfig]", "[keys]", "all"];

	#configCollections = new Set();

	constructor() {
		// BREAKING TODO move this back to non-circular with errors
		super({ circular: true });

		let previous;
		// establish stage relationships, all uses keys, keys uses userconfig, userconfig uses tags
		for (let stageName of TemplateDepGraph.STAGES.filter(Boolean).reverse()) {
			let stageKey = `${COLLECTION_PREFIX}${stageName}`;
			if (previous) {
				this.uses(previous, stageKey);
			}
			previous = stageKey;
		}
	}

	uses(from, to) {
		this.addDependency(from, to);
	}

	addTag(tagName, type) {
		if (
			tagName === "all" ||
			(tagName.startsWith("[") && tagName.endsWith("]")) ||
			this.#configCollections.has(tagName)
		) {
			return;
		}
		if (!type) {
			throw new Error(
				"Missing tag type for addTag. Expecting 'userconfig' or 'basic'. Received: " + type,
			);
		}

		this.uses(`${COLLECTION_PREFIX}[${type}]`, `${COLLECTION_PREFIX}${tagName}`);
	}

	addConfigCollectionName(collectionName) {
		if (collectionName === "all") {
			return;
		}

		this.#configCollections.add(collectionName);
		// Collection relationships to `[userconfig]` are added last, in unfilteredOrder()
	}

	addTemplate(filePath, consumes = [], publishesTo = []) {
		// Move to the beginning if it doesn’t consume anything
		if (consumes.length === 0) {
			this.uses(`${COLLECTION_PREFIX}[basic]`, filePath);
		}

		// Can’t consume AND publish to `all` simultaneously
		let consumesAll = consumes.includes("all");
		if (consumesAll) {
			publishesTo = publishesTo.filter((entry) => entry !== "all");
		}

		for (let collectionName of publishesTo) {
			if (!consumesAll) {
				let tagType = "basic";

				let consumesUserConfigCollection = consumes.find((entry) =>
					this.#configCollections.has(entry),
				);
				if (consumesUserConfigCollection) {
					tagType = "userconfig";
				}
				this.addTag(collectionName, tagType);
			}

			this.uses(`${COLLECTION_PREFIX}${collectionName}`, filePath);
		}

		for (let collectionName of consumes) {
			this.uses(filePath, `${COLLECTION_PREFIX}${collectionName}`);

			let stageIndex = TemplateDepGraph.STAGES.indexOf(collectionName);
			let nextStage = stageIndex > 0 ? TemplateDepGraph.STAGES[stageIndex + 1] : undefined;
			if (nextStage) {
				this.uses(`${COLLECTION_PREFIX}${nextStage}`, filePath);
			}
		}
	}

	addDependency(from, to) {
		if (!this.hasNode(from)) {
			this.addNode(from);
		}
		if (!this.hasNode(to)) {
			this.addNode(to);
		}
		super.addDependency(from, to);
	}

	unfilteredOrder() {
		// these need to be added last, after the template map has been added (see addConfigCollectionName)
		for (let collectionName of this.#configCollections) {
			this.uses(`${COLLECTION_PREFIX}[userconfig]`, `${COLLECTION_PREFIX}${collectionName}`);
		}

		return super.overallOrder();
	}

	overallOrder() {
		let unfiltered = this.unfilteredOrder();
		let filtered = unfiltered.filter((entry) => {
			return !entry.startsWith("[") && !entry.endsWith("]");
		});

		// Add another collections.all entry (if not already the last one)
		if (filtered[filtered.length - 1] !== `${COLLECTION_PREFIX}all`) {
			filtered.push(`${COLLECTION_PREFIX}all`);
		}

		return filtered;
	}
}
