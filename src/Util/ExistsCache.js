import fs from "node:fs";

// Checks both files and directories
class ExistsCache {
	#exists = new Map();
	#dirs = new Map();

	constructor() {
		this.lookupCount = 0;
	}

	get size() {
		return this.#exists.size;
	}

	has(path) {
		return this.#exists.has(path);
	}

	// Relative paths (to root directory) expected (but not enforced due to perf costs)
	exists(path) {
		if (!this.#exists.has(path)) {
			let exists = fs.existsSync(path);
			this.lookupCount++;

			// mark for next time
			this.#exists.set(path, Boolean(exists));

			return exists;
		}

		return this.#exists.get(path);
	}

	isDirectory(path) {
		if (!this.exists(path)) {
			return false;
		}

		if (!this.#dirs.has(path)) {
			let isDir = fs.statSync(path).isDirectory();
			this.lookupCount++;

			// mark for next time
			this.#dirs.set(path, isDir);

			return isDir;
		}

		return this.#dirs.get(path);
	}
}

export default ExistsCache;
