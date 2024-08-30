import isGlob from "is-glob";
import { TemplatePath } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import EleventyExtensionMap from "./EleventyExtensionMap.js";
import EleventyBaseError from "./Errors/EleventyBaseError.js";
import TemplatePassthrough from "./TemplatePassthrough.js";
import checkPassthroughCopyBehavior from "./Util/PassthroughCopyBehaviorCheck.js";
import { isGlobMatch } from "./Util/GlobMatcher.js";

const debug = debugUtil("Eleventy:TemplatePassthroughManager");
const debugDev = debugUtil("Dev:Eleventy:TemplatePassthroughManager");

class TemplatePassthroughManagerConfigError extends EleventyBaseError {}
class TemplatePassthroughManagerCopyError extends EleventyBaseError {}

class TemplatePassthroughManager {
	constructor(eleventyConfig) {
		if (!eleventyConfig || eleventyConfig.constructor.name !== "TemplateConfig") {
			throw new TemplatePassthroughManagerConfigError("Missing or invalid `config` argument.");
		}
		this.eleventyConfig = eleventyConfig;
		this.config = eleventyConfig.getConfig();
		this.reset();
	}

	reset() {
		this.count = 0;
		this.size = 0;
		this.conflictMap = {};
		this.incrementalFile = null;
		debug("Resetting counts to 0");
	}

	set extensionMap(extensionMap) {
		this._extensionMap = extensionMap;
	}

	get extensionMap() {
		if (!this._extensionMap) {
			this._extensionMap = new EleventyExtensionMap(this.eleventyConfig);
			this._extensionMap.setFormats([]);
		}
		return this._extensionMap;
	}

	get dirs() {
		return this.eleventyConfig.directories;
	}

	get inputDir() {
		return this.dirs.input;
	}

	get outputDir() {
		return this.dirs.output;
	}

	setDryRun(isDryRun) {
		this.isDryRun = !!isDryRun;
	}

	setRunMode(runMode) {
		this.runMode = runMode;
	}

	setIncrementalFile(path) {
		if (path) {
			this.incrementalFile = path;
		}
	}

	_normalizePaths(path, outputPath, copyOptions = {}) {
		return {
			inputPath: TemplatePath.addLeadingDotSlash(path),
			outputPath: outputPath ? TemplatePath.stripLeadingDotSlash(outputPath) : true,
			copyOptions,
		};
	}

	getConfigPaths() {
		let paths = [];
		let pathsRaw = this.config.passthroughCopies || {};
		debug("`addPassthroughCopy` config API paths: %o", pathsRaw);
		for (let [inputPath, { outputPath, copyOptions }] of Object.entries(pathsRaw)) {
			paths.push(this._normalizePaths(inputPath, outputPath, copyOptions));
		}
		debug("`addPassthroughCopy` config API normalized paths: %o", paths);
		return paths;
	}

	getConfigPathGlobs() {
		return this.getConfigPaths().map((path) => {
			return TemplatePath.convertToRecursiveGlobSync(path.inputPath);
		});
	}

	getNonTemplatePaths(paths) {
		let matches = [];
		for (let path of paths) {
			if (!this.extensionMap.hasEngine(path)) {
				matches.push(path);
			}
		}

		return matches;
	}

	getCopyCount() {
		return this.count;
	}

	getCopySize() {
		return this.size;
	}

	setFileSystemSearch(fileSystemSearch) {
		this.fileSystemSearch = fileSystemSearch;
	}

	getTemplatePassthroughForPath(path, isIncremental = false) {
		let inst = new TemplatePassthrough(path, this.eleventyConfig);

		inst.setFileSystemSearch(this.fileSystemSearch);
		inst.setIsIncremental(isIncremental);
		inst.setDryRun(this.isDryRun);
		inst.setRunMode(this.runMode);

		return inst;
	}

	async copyPassthrough(pass) {
		if (!(pass instanceof TemplatePassthrough)) {
			throw new TemplatePassthroughManagerCopyError(
				"copyPassthrough expects an instance of TemplatePassthrough",
			);
		}

		let { inputPath } = pass.getPath();

		// TODO https://github.com/11ty/eleventy/issues/2452
		// De-dupe both the input and output paired together to avoid the case
		// where an input/output pair has been added via multiple passthrough methods (glob, file suffix, etc)
		// Probably start with the `filter` callback in recursive-copy but it only passes relative paths
		// See the note in TemplatePassthrough.js->write()

		// Also note that `recursive-copy` handles repeated overwrite copy to the same destination just fine.
		// e.g. `for(let j=0, k=1000; j<k; j++) { copy("coolkid.jpg", "_site/coolkid.jpg"); }`

		// Eventually we’ll want to move all of this to use Node’s fs.cp, which is experimental and only on Node 16+

		return pass.write().then(
			({ size, count, map }) => {
				for (let src in map) {
					let dest = map[src];
					if (this.conflictMap[dest]) {
						if (src !== this.conflictMap[dest]) {
							throw new TemplatePassthroughManagerCopyError(
								`Multiple passthrough copy files are trying to write to the same output file (${dest}). ${src} and ${this.conflictMap[dest]}`,
							);
						} else {
							// Multiple entries from the same source
							debug(
								"A passthrough copy entry (%o) caused the same file (%o) to be copied more than once to the output (%o). This is atomically safe but a waste of build resources.",
								inputPath,
								src,
								dest,
							);
						}
					}

					debugDev("Adding %o to passthrough copy conflict map, from %o", dest, src);

					this.conflictMap[dest] = src;
				}

				if (pass.isDryRun) {
					// We don’t count the skipped files as we need to iterate over them
					debug(
						"Skipped %o (either from --dryrun or --incremental or for-free passthrough copy)",
						inputPath,
					);
				} else {
					if (count) {
						this.count += count;
						this.size += size;
						debug("Copied %o (%d files, %d size)", inputPath, count || 0, size || 0);
					} else {
						debug("Skipped copying %o (emulated passthrough copy)", inputPath);
					}
				}

				return {
					count,
					map,
				};
			},
			function (e) {
				return Promise.reject(
					new TemplatePassthroughManagerCopyError(`Having trouble copying '${inputPath}'`, e),
				);
			},
		);
	}

	isPassthroughCopyFile(paths, changedFile) {
		if (!changedFile) {
			return false;
		}

		// passthrough copy by non-matching engine extension (via templateFormats)
		for (let path of paths) {
			if (path === changedFile && !this.extensionMap.hasEngine(path)) {
				return true;
			}
		}

		for (let path of this.getConfigPaths()) {
			if (TemplatePath.startsWithSubPath(changedFile, path.inputPath)) {
				return path;
			}
			if (changedFile && isGlob(path.inputPath) && isGlobMatch(changedFile, [path.inputPath])) {
				return path;
			}
		}

		return false;
	}

	getAllNormalizedPaths(paths) {
		if (this.incrementalFile) {
			let isPassthrough = this.isPassthroughCopyFile(paths, this.incrementalFile);

			if (isPassthrough) {
				if (isPassthrough.outputPath) {
					return [this._normalizePaths(this.incrementalFile, isPassthrough.outputPath)];
				}

				return [this._normalizePaths(this.incrementalFile)];
			}

			// Fixes https://github.com/11ty/eleventy/issues/2491
			if (!checkPassthroughCopyBehavior(this.config, this.runMode)) {
				return [];
			}
		}

		let normalizedPaths = this.getConfigPaths();
		if (debug.enabled) {
			for (let path of normalizedPaths) {
				debug("TemplatePassthrough copying from config: %o", path);
			}
		}

		if (paths?.length) {
			let passthroughPaths = this.getNonTemplatePaths(paths);
			for (let path of passthroughPaths) {
				let normalizedPath = this._normalizePaths(path);

				debug(
					`TemplatePassthrough copying from non-matching file extension: ${normalizedPath.inputPath}`,
				);

				normalizedPaths.push(normalizedPath);
			}
		}

		return normalizedPaths;
	}

	// keys: output
	// values: input
	getAliasesFromPassthroughResults(result) {
		let entries = {};
		for (let entry of result) {
			for (let src in entry.map) {
				let dest = TemplatePath.stripLeadingSubPath(entry.map[src], this.outputDir);
				entries["/" + encodeURI(dest)] = src;
			}
		}
		return entries;
	}

	// Performance note: these can actually take a fair bit of time, but aren’t a
	// bottleneck to eleventy. The copies are performed asynchronously and don’t affect eleventy
	// write times in a significant way.
	async copyAll(templateExtensionPaths) {
		debug("TemplatePassthrough copy started.");
		let normalizedPaths = this.getAllNormalizedPaths(templateExtensionPaths);

		let passthroughs = normalizedPaths.map((path) => {
			// if incrementalFile is set but it isn’t a passthrough copy, normalizedPaths will be an empty array
			let isIncremental = !!this.incrementalFile;

			return this.getTemplatePassthroughForPath(path, isIncremental);
		});

		let promises = passthroughs.map((pass) => this.copyPassthrough(pass));
		return Promise.all(promises).then(async (results) => {
			let aliases = this.getAliasesFromPassthroughResults(results);
			await this.config.events.emit("eleventy.passthrough", {
				map: aliases,
			});

			debug(`TemplatePassthrough copy finished. Current count: ${this.count} (size: ${this.size})`);
			return results;
		});
	}
}

export default TemplatePassthroughManager;
