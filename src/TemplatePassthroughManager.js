import multimatch from "multimatch";
import isGlob from "is-glob";
import { TemplatePath } from "@11ty/eleventy-utils";
import debugUtil from "debug";

import EleventyExtensionMap from "./EleventyExtensionMap.js";
import EleventyBaseError from "./EleventyBaseError.js";
import TemplatePassthrough from "./TemplatePassthrough.js";
import checkPassthroughCopyBehavior from "./Util/PassthroughCopyBehaviorCheck.js";

const debug = debugUtil("Eleventy:TemplatePassthroughManager");
const debugDev = debugUtil("Dev:Eleventy:TemplatePassthroughManager");

class TemplatePassthroughManagerConfigError extends EleventyBaseError {}
class TemplatePassthroughManagerCopyError extends EleventyBaseError {}

class TemplatePassthroughManager {
	constructor(eleventyConfig) {
		if (!eleventyConfig) {
			throw new TemplatePassthroughManagerConfigError("Missing `config` argument.");
		}
		this.eleventyConfig = eleventyConfig;
		this.config = eleventyConfig.getConfig();
		this.reset();
	}

	reset() {
		this.count = 0;
		this.conflictMap = {};
		this.incrementalFile = null;
		debug("Resetting counts to 0");
	}

	set extensionMap(extensionMap) {
		this._extensionMap = extensionMap;
	}

	get extensionMap() {
		if (!this._extensionMap) {
			this._extensionMap = new EleventyExtensionMap([], this.eleventyConfig);
		}
		return this._extensionMap;
	}

	setOutputDir(outputDir) {
		this.outputDir = outputDir;
	}

	setInputDir(inputDir) {
		this.inputDir = inputDir;
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
		const paths = [];
		const pathsRaw = this.config.passthroughCopies || {};
		debug("`addPassthroughCopy` config API paths: %o", pathsRaw);
		for (const [inputPath, { outputPath, copyOptions }] of Object.entries(pathsRaw)) {
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
		const matches = [];
		for (const path of paths) {
			if (!this.extensionMap.hasEngine(path)) {
				matches.push(path);
			}
		}

		return matches;
	}

	getCopyCount() {
		return this.count;
	}

	setFileSystemSearch(fileSystemSearch) {
		this.fileSystemSearch = fileSystemSearch;
	}

	getTemplatePassthroughForPath(path, isIncremental = false) {
		const inst = new TemplatePassthrough(path, this.outputDir, this.inputDir, this.config);

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

		const { inputPath } = pass.getPath();

		// TODO https://github.com/11ty/eleventy/issues/2452
		// De-dupe both the input and output paired together to avoid the case
		// where an input/output pair has been added via multiple passthrough methods (glob, file suffix, etc)
		// Probably start with the `filter` callback in recursive-copy but it only passes relative paths
		// See the note in TemplatePassthrough.js->write()

		// Also note that `recursive-copy` handles repeated overwrite copy to the same destination just fine.
		// e.g. `for(let j=0, k=1000; j<k; j++) { copy("coolkid.jpg", "_site/coolkid.jpg"); }`

		// Eventually we’ll want to move all of this to use Node’s fs.cp, which is experimental and only on Node 16+

		return pass
			.write()
			.then(({ count, map }) => {
				for (const src in map) {
					const dest = map[src];
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
						debug("Copied %o (%d files)", inputPath, count || 0);
					} else {
						debug("Skipped copying %o (emulated passthrough copy)", inputPath);
					}
				}

				return {
					count,
					map,
				};
			})
			.catch(function (e) {
				return Promise.reject(
					new TemplatePassthroughManagerCopyError(`Having trouble copying '${inputPath}'`, e),
				);
			});
	}

	isPassthroughCopyFile(paths, changedFile) {
		// passthrough copy by non-matching engine extension (via templateFormats)
		for (const path of paths) {
			if (path === changedFile && !this.extensionMap.hasEngine(path)) {
				return true;
			}
		}

		for (const path of this.getConfigPaths()) {
			if (TemplatePath.startsWithSubPath(changedFile, path.inputPath)) {
				return path;
			}
			if (
				changedFile &&
				isGlob(path.inputPath) &&
				multimatch([changedFile], [path.inputPath]).length
			) {
				return path;
			}
		}

		return false;
	}

	getAllNormalizedPaths(paths) {
		if (this.incrementalFile) {
			const isPassthrough = this.isPassthroughCopyFile(paths, this.incrementalFile);

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

		const normalizedPaths = this.getConfigPaths();
		if (debug.enabled) {
			for (const path of normalizedPaths) {
				debug("TemplatePassthrough copying from config: %o", path);
			}
		}

		if (paths && paths.length) {
			const passthroughPaths = this.getNonTemplatePaths(paths);
			for (const path of passthroughPaths) {
				const normalizedPath = this._normalizePaths(path);

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
		const entries = {};
		for (const entry of result) {
			for (const src in entry.map) {
				const dest = TemplatePath.stripLeadingSubPath(entry.map[src], this.outputDir);
				entries["/" + dest] = src;
			}
		}
		return entries;
	}

	// Performance note: these can actually take a fair bit of time, but aren’t a
	// bottleneck to eleventy. The copies are performed asynchronously and don’t affect eleventy
	// write times in a significant way.
	async copyAll(templateExtensionPaths) {
		debug("TemplatePassthrough copy started.");
		const normalizedPaths = this.getAllNormalizedPaths(templateExtensionPaths);

		const passthroughs = normalizedPaths.map((path) => {
			// if incrementalFile is set but it isn’t a passthrough copy, normalizedPaths will be an empty array
			const isIncremental = !!this.incrementalFile;

			return this.getTemplatePassthroughForPath(path, isIncremental);
		});

		const promises = passthroughs.map((pass) => this.copyPassthrough(pass));
		return Promise.all(promises).then(async (results) => {
			const aliases = this.getAliasesFromPassthroughResults(results);
			await this.config.events.emit("eleventy.passthrough", {
				map: aliases,
			});

			debug(`TemplatePassthrough copy finished. Current count: ${this.count}`);
			return results;
		});
	}
}

export default TemplatePassthroughManager;
