import fs from "graceful-fs";
import PathNormalizer from "./PathNormalizer.js";

// Checks both files and directories
class ExistsCache {
	constructor() {
		this._cache = new Map();
		this.lookupCount = 0;
	}

	setDirectoryCheck(check) {
		this.cacheDirectories = !!check;
	}

	get size() {
		return this._cache.size;
	}

	parentsDoNotExist(path) {
		if (!this.cacheDirectories) {
			return false;
		}

		let allPaths = PathNormalizer.getAllPaths(path).filter((entry) => entry !== path);
		for (let parentPath of allPaths) {
			if (this._cache.has(parentPath)) {
				if (this._cache.get(parentPath) === false) {
					return true; // we know this parent doesn’t exist
				}
			}
		}

		// if you’ve made it here: we don’t know if the parents exist or not
		return false;
	}

	has(path) {
		return this._cache.has(path);
	}

	exists(path) {
		path = PathNormalizer.fullNormalization(path);

		let exists = this._cache.get(path);
		if (this.parentsDoNotExist(path)) {
			// we don’t need to check if a parent directory does not exist
			exists = false;
		} else if (!this.has(path)) {
			exists = fs.existsSync(path);
			this.markExistsWithParentDirectories(path, exists);
			this.lookupCount++;
		}

		return exists;
	}

	// if a file exists, we can mark the parent directories as existing also
	// if a file does not exist, we don’t know if the parent directories exist or not (yet)
	markExistsWithParentDirectories(path, exists = true) {
		path = PathNormalizer.fullNormalization(path);

		if (!this.cacheDirectories || !exists) {
			this.markExists(path, false, true);
			return;
		}

		let paths = PathNormalizer.getAllPaths(path);
		for (let fullpath of paths) {
			this.markExists(fullpath, true, true);
		}
	}

	markExists(path, exists = true, alreadyNormalized = false) {
		if (!alreadyNormalized) {
			path = PathNormalizer.fullNormalization(path);
		}

		this._cache.set(path, !!exists);
	}
}

export default ExistsCache;
