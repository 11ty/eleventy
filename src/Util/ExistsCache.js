import fs from "graceful-fs";
import PathNormalizer from "./PathNormalizer.js";

// Checks both files and directories
class ExistsCache {
	constructor() {
		this._cache = new Map();
		this.lookupCount = 0;
	}

	setDirectoryCheck(check) {
		this.shouldCacheDirectories = !!check;
	}

	get size() {
		return this._cache.size;
	}

	parentsDoNotExist(path) {
		if (!this.shouldCacheDirectories) {
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
		return undefined;
	}

	has(path) {
		return this._cache.has(path);
	}

	exists(path) {
		path = PathNormalizer.fullNormalization(path);

		if (this.parentsDoNotExist(path)) {
			// we don’t need to check if we already know the parent directories do not exist
			return false;
		} else if (!this._cache.has(path)) {
			let exists = fs.existsSync(path);
			this.lookupCount++;

			this.markExistsWithParentDirectories(path, exists);

			return exists;
		}

		return this._cache.get(path);
	}

	// if a file exists, we can mark the parent directories as existing also
	// if a file does not exist, we don’t know if the parent directories exist or not (yet)
	markExistsWithParentDirectories(path, exists = true) {
		path = PathNormalizer.fullNormalization(path);

		if (!this.shouldCacheDirectories || !exists) {
			// does not exist: only mark path
			this.markExists(path, false, true);
			return;
		}

		// exists: mark path and parents
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
