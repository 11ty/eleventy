import path from "node:path";
import { glob } from "tinyglobby";
import { TemplatePath } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import ProjectDirectories from "./Util/ProjectDirectories.js";
import { isGlobMatch } from "./Util/GlobMatcher.js";

const debug = debugUtil("Eleventy:FileSystemSearch");

class FileSystemSearch {
	constructor() {
		this.inputs = {};
		this.outputs = {};
		this.promises = {};
		this.count = 0;
	}

	getCacheKey(key, globs, options) {
		if (Array.isArray(globs)) {
			globs = globs.sort();
		}
		return key + JSON.stringify(globs) + JSON.stringify(options);
	}

	static getParentDirPrefix(filePath = "") {
		let count = [];
		for (let p of filePath.split(path.sep)) {
			if (p === "..") {
				count.push("..");
			} else {
				break;
			}
		}

		if (count.length > 0) {
			// trailing slash
			return count.join(path.sep) + path.sep;
		}
		return "";
	}

	static getShortestParentDirPrefix(filePaths) {
		let shortest = "";
		filePaths
			.map((entry) => {
				return FileSystemSearch.getParentDirPrefix(entry);
			})
			.filter((entry) => Boolean(entry))
			.forEach((prefix) => {
				if (!shortest || prefix.length < shortest.length) {
					shortest = prefix;
				}
			});
		return shortest;
	}

	// returns a promise
	search(key, globs, options = {}) {
		debug("Glob search (%o) searching for: %o", key, globs);

		if (!Array.isArray(globs)) {
			globs = [globs];
		}

		// Strip leading slashes from everything!
		globs = globs.map((entry) => TemplatePath.stripLeadingDotSlash(entry));

		let shortestParentPrefix = FileSystemSearch.getShortestParentDirPrefix(globs);
		if (shortestParentPrefix) {
			options.cwd = shortestParentPrefix;
		}

		if (options.ignore && Array.isArray(options.ignore)) {
			options.ignore = options.ignore.map((entry) => {
				entry = TemplatePath.stripLeadingDotSlash(entry);
				if (shortestParentPrefix) {
					if (!entry.startsWith("**/") && !entry.startsWith(".git/**")) {
						entry = ProjectDirectories.getRelativeTo(entry, shortestParentPrefix);
					}
				}
				return entry;
			});
			debug("Glob search (%o) ignoring: %o", key, options.ignore);
		}

		let cacheKey = this.getCacheKey(key, globs, options);

		// Only after the promise has resolved
		if (this.outputs[cacheKey]) {
			return Array.from(this.outputs[cacheKey]);
		}

		if (!this.promises[cacheKey]) {
			this.inputs[cacheKey] = {
				input: globs,
				options,
			};

			this.count++;

			globs = globs.map((entry) => {
				if (shortestParentPrefix && entry.startsWith(shortestParentPrefix)) {
					return ProjectDirectories.getRelativeTo(entry, shortestParentPrefix);
				}
				return entry;
			});

			this.promises[cacheKey] = glob(
				globs,
				Object.assign(
					{
						caseSensitiveMatch: false, // insensitive
						dot: true,
					},
					options,
				),
			).then((results) => {
				this.outputs[cacheKey] = new Set(
					results.map((entry) => {
						if (options.cwd) {
							entry = path.join(options.cwd, entry);
						}
						return TemplatePath.standardizeFilePath(entry);
					}),
				);

				return Array.from(this.outputs[cacheKey]);
			});
		}

		// may be an unresolved promise
		return this.promises[cacheKey];
	}

	_modify(path, setOperation) {
		path = TemplatePath.stripLeadingDotSlash(path);

		let normalized = TemplatePath.standardizeFilePath(path);

		for (let key in this.inputs) {
			let { input, options } = this.inputs[key];
			if (
				isGlobMatch(path, input, {
					ignore: options.ignore,
				})
			) {
				this.outputs[key][setOperation](normalized);
			}
		}
	}

	add(path) {
		this._modify(path, "add");
	}

	delete(path) {
		this._modify(path, "delete");
	}
}

export default FileSystemSearch;
