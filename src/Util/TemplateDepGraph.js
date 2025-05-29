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

	addTag(tagName) {
		if (
			tagName === "all" ||
			(tagName.startsWith("[") && tagName.endsWith("]")) ||
			this.#configCollections.has(tagName)
		) {
			return;
		}

		this.uses(`${COLLECTION_PREFIX}[basic]`, `${COLLECTION_PREFIX}${tagName}`);
	}

	addConfigCollectionName(collectionName) {
		if (collectionName === "all") {
			return;
		}

		this.#configCollections.add(collectionName);

		this.uses(`${COLLECTION_PREFIX}[userconfig]`, `${COLLECTION_PREFIX}${collectionName}`);
	}

	addTemplate(filePath, consumes = [], publishesTo = []) {
		// Move to the beginning if it doesn’t consume anything
		if (consumes.length === 0) {
			this.uses(`${COLLECTION_PREFIX}[basic]`, filePath);
		}

		// Can’t consume and publish to `all`
		let isConsumingAll = consumes.includes("all");
		if (isConsumingAll) {
			publishesTo = publishesTo.filter((entry) => entry !== "all");
		}

		for (let collectionName of publishesTo) {
			this.addTag(collectionName);
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
		return super.overallOrder();
	}

	overallOrder() {
		let filtered = super.overallOrder().filter((entry) => {
			return !entry.startsWith("[") && !entry.endsWith("]");
		});

		// Add another collections.all entry (if not already the last one)
		if (filtered[filtered.length - 1] !== `${COLLECTION_PREFIX}all`) {
			filtered.push(`${COLLECTION_PREFIX}all`);
		}

		return filtered;
	}
}
