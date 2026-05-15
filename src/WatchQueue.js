import { TemplatePath } from "@11ty/eleventy-utils";

import PathNormalizer from "./Util/PathNormalizer.js";

/* Decides when to watch and in what mode to watch
 * Incremental builds don’t batch changes, they queue.
 * Nonincremental builds batch.
 */

class WatchQueue {
	constructor() {
		this.incremental = false;
		this.activeQueue = [];
	}

	reset() {
		this.pendingQueue = [];
		this.activeQueue = [];
	}

	isBuildRunning() {
		return this.activeQueue.length > 0;
	}

	startBuild() {
		// pop waiting queue into the active queue
		this.activeQueue = this.popNextActiveQueue();
	}

	finishBuild() {
		this.activeQueue = [];
	}

	getIncrementalFile() {
		if (this.incremental) {
			return this.activeQueue.length ? this.activeQueue[0] : false;
		}

		return false;
	}

	/* Returns the changed files currently being operated on in the current `watch` build
	 * Works with or without incremental (though in incremental only one file per time will be processed)
	 */
	getActiveQueue() {
		if (!this.isBuildRunning()) {
			return [];
		} else if (this.incremental && this.activeQueue.length === 0) {
			return [];
		} else if (this.incremental) {
			return [this.activeQueue[0]];
		}

		return this.activeQueue;
	}

	_queueMatches(file) {
		let filterCallback;
		if (typeof file === "function") {
			filterCallback = file;
		} else {
			filterCallback = (path) => path === file;
		}

		return this.activeQueue.filter(filterCallback);
	}

	hasAllQueueFiles(file) {
		return (
			this.activeQueue.length > 0 && this.activeQueue.length === this._queueMatches(file).length
		);
	}

	hasQueuedFile(file) {
		if (file) {
			return this._queueMatches(file).length > 0;
		}
		return false;
	}

	hasQueuedFiles(files) {
		for (const file of files) {
			if (this.hasQueuedFile(file)) {
				return true;
			}
		}
		return false;
	}

	get pendingQueue() {
		if (!this._queue) {
			this._queue = [];
		}
		return this._queue;
	}

	set pendingQueue(value) {
		this._queue = value;
	}

	addToPendingQueue(path) {
		if (path) {
			path = PathNormalizer.normalizeSeperator(TemplatePath.addLeadingDotSlash(path));
			if (!this.pendingQueue.includes(path)) {
				this.pendingQueue.push(path);
				// added
				return true;
			}
		}
		// skipped
		return false;
	}

	getPendingQueueSize() {
		return this.pendingQueue.length;
	}

	getPendingQueue() {
		return this.pendingQueue;
	}

	getActiveQueueSize() {
		return this.activeQueue.length;
	}

	// returns array
	popNextActiveQueue() {
		if (this.incremental) {
			return this.pendingQueue.length ? [this.pendingQueue.shift()] : [];
		}

		let ret = this.pendingQueue.slice();
		this.pendingQueue = [];
		return ret;
	}
}

export default WatchQueue;
