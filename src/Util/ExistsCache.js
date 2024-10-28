import fs from "node:fs";

// Checks both files and directories
class ExistsCache {
	constructor() {
		this._cache = new Map();
		this.lookupCount = 0;
	}

	get size() {
		return this._cache.size;
	}

	has(path) {
		return this._cache.has(path);
	}

	// Relative paths (to root directory) expected (but not enforced due to perf costs)
	exists(path) {
		if (!this._cache.has(path)) {
			let exists = fs.existsSync(path);
			this.lookupCount++;

			this.markExists(path, exists);

			return exists;
		}

		return this._cache.get(path);
	}

	markExists(path, exists = true) {
		this._cache.set(path, !!exists);
	}
}

export default ExistsCache;
