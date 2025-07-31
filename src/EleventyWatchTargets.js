import { TemplatePath } from "@11ty/eleventy-utils";
import { DepGraph } from "dependency-graph";

import { isGlobMatch } from "./Util/GlobMatcher.js";
import { GlobStripper } from "./Util/GlobStripper.js";
import JavaScriptDependencies from "./Util/JavaScriptDependencies.js";
import eventBus from "./EventBus.js";

export default class WatchTargets {
	#templateConfig;

	constructor(templateConfig) {
		this.targets = new Set();
		this.dependencies = new Set();
		this.newTargets = new Set();
		this.globMatch = new Set();
		this.isEsm = false;

		this.graph = new DepGraph();
		this.#templateConfig = templateConfig;
	}

	setProjectUsingEsm(isEsmProject) {
		this.isEsm = !!isEsmProject;
	}

	isJavaScriptDependency(path) {
		return this.dependencies.has(path);
	}

	reset() {
		this.newTargets = new Set();
	}

	addToDependencyGraph(parent, deps) {
		if (!this.graph.hasNode(parent)) {
			this.graph.addNode(parent);
		}
		for (let dep of deps) {
			if (!this.graph.hasNode(dep)) {
				this.graph.addNode(dep);
			}
			this.graph.addDependency(parent, dep);
		}
	}

	uses(parent, dep) {
		return this.getDependenciesOf(parent).includes(dep);
	}

	getDependenciesOf(parent) {
		if (!this.graph.hasNode(parent)) {
			return [];
		}
		return this.graph.dependenciesOf(parent);
	}

	getDependantsOf(child) {
		if (!this.graph.hasNode(child)) {
			return [];
		}
		return this.graph.dependantsOf(child);
	}

	addRaw(targets, isDependency) {
		for (let target of targets) {
			let path = TemplatePath.addLeadingDotSlash(target);
			if (!this.targets.has(target)) {
				this.newTargets.add(path);
			}

			this.targets.add(path);

			if (isDependency) {
				this.dependencies.add(path);
			}
		}
	}

	static normalize(targets) {
		if (!targets) {
			return [];
		} else if (Array.isArray(targets)) {
			return targets;
		}

		return [targets];
	}

	isWatchMatch(filepath, ignoreGlobs = []) {
		return (
			isGlobMatch(filepath, Array.from(this.globMatch)) &&
			(ignoreGlobs.length > 0 ? !isGlobMatch(filepath, ignoreGlobs) : true)
		);
	}

	// add only a target
	add(targets) {
		if (typeof targets === "string") {
			targets = [targets];
		}

		let uniqueSet = new Set();
		for (let target of targets) {
			if (!target) {
				continue;
			}

			let { path } = GlobStripper.parse(target);
			if (path) {
				uniqueSet.add(path);
			}

			// should work even without path (e.g. `./**/*` globs)
			this.globMatch.add(TemplatePath.stripLeadingDotSlash(target));
		}

		this.addRaw(Array.from(uniqueSet));
	}

	static normalizeToGlobs(targets) {
		return WatchTargets.normalize(targets).map((entry) =>
			TemplatePath.convertToRecursiveGlobSync(entry),
		);
	}

	// add only a target’s dependencies
	async addDependencies(targets, filterCallback) {
		if (this.#templateConfig && !this.#templateConfig.shouldSpiderJavaScriptDependencies()) {
			return;
		}

		targets = WatchTargets.normalize(targets);
		let deps = await JavaScriptDependencies.getDependencies(targets, this.isEsm);
		if (filterCallback) {
			deps = deps.filter(filterCallback);
		}

		for (let target of targets) {
			this.addToDependencyGraph(target, deps);
		}
		this.addRaw(deps, true);
	}

	setWriter(templateWriter) {
		this.writer = templateWriter;
	}

	clearImportCacheFor(filePathArray) {
		let paths = new Set();
		for (const filePath of filePathArray) {
			paths.add(filePath);

			// Delete from require cache so that updates to the module are re-required
			let importsTheChangedFile = this.getDependantsOf(filePath);
			for (let dep of importsTheChangedFile) {
				paths.add(dep);
			}

			let isImportedInTheChangedFile = this.getDependenciesOf(filePath);
			for (let dep of isImportedInTheChangedFile) {
				paths.add(dep);
			}

			// Use GlobalDependencyMap
			if (this.#templateConfig) {
				for (let dep of this.#templateConfig.usesGraph.getDependantsFor(filePath)) {
					paths.add(dep);
				}
			}
		}

		eventBus.emit("eleventy.importCacheReset", paths);
	}

	getNewTargetsSinceLastReset() {
		return Array.from(this.newTargets);
	}

	getTargets() {
		return Array.from(this.targets);
	}

	getTargetGlobs() {
		return Array.from(this.globMatch);
	}
}
