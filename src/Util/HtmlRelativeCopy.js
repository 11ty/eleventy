import path from "node:path";
import { TemplatePath, createHashHexSync } from "@11ty/eleventy-utils";
import isValidUrl from "./ValidUrl.js";
import { isGlobMatch } from "./GlobMatcher.js";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

class HtmlRelativeCopy {
	#userConfig;
	#matchingGlobs = new Set();
	#matchingGlobsArray;
	#dirty = false;
	#paths = new Set();
	#failOnError = true;
	#copyOptions = {
		dot: false, // differs from standard passthrough copy
	};

	static RESOLVE_PREFIX = "resolve:";

	isEnabled() {
		return this.#matchingGlobs.size > 0;
	}

	setFailOnError(failOnError) {
		this.#failOnError = Boolean(failOnError);
	}

	setCopyOptions(opts) {
		if (opts) {
			Object.assign(this.#copyOptions, opts);
		}
	}

	setUserConfig(userConfig) {
		if (!userConfig || userConfig.constructor.name !== "UserConfig") {
			throw new Error(
				"Internal error: Missing `userConfig` or was not an instance of `UserConfig`.",
			);
		}
		this.#userConfig = userConfig;
	}

	addPaths(paths = []) {
		for (let path of paths) {
			this.#paths.add(TemplatePath.getDir(path));
		}
	}

	get matchingGlobs() {
		if (this.#dirty || !this.#matchingGlobsArray) {
			this.#matchingGlobsArray = Array.from(this.#matchingGlobs);
			this.#dirty = false;
		}

		return this.#matchingGlobsArray;
	}

	addMatchingGlob(glob) {
		if (glob) {
			if (Array.isArray(glob)) {
				for (let g of glob) {
					this.#matchingGlobs.add(g);
				}
			} else {
				this.#matchingGlobs.add(glob);
			}
			this.#dirty = true;
		}
	}

	// Does *not* account for resolve prefixes
	isSkippableHref(rawRef) {
		if (
			this.#matchingGlobs.size === 0 ||
			!rawRef ||
			path.isAbsolute(rawRef) ||
			isValidUrl(rawRef)
		) {
			return true;
		}
		return false;
	}

	isCopyableTarget(target) {
		if (!isGlobMatch(target, this.matchingGlobs)) {
			return false;
		}

		return true;
	}

	exists(filePath) {
		return this.#userConfig.exists(filePath);
	}

	getAliasedPath(ref) {
		for (let dir of this.#paths) {
			let found = TemplatePath.join(dir, ref);
			if (this.isCopyableTarget(found) && this.exists(found)) {
				return found;
			}
		}
	}

	isResolvePrefixed(ref) {
		return ref?.startsWith(HtmlRelativeCopy.RESOLVE_PREFIX);
	}

	resolvePrefixedPath(ref, relativeTo) {
		if (!this.isResolvePrefixed(ref)) {
			throw new Error(
				`Cannot resolve reference without a ${HtmlRelativeCopy.RESOLVE_PREFIX} prefix. Received: ${ref}`,
			);
		}

		let relativeToFileUrl = pathToFileURL(relativeTo);
		ref = ref.slice(HtmlRelativeCopy.RESOLVE_PREFIX.length);

		// Supported in Node v20.6.0+, v18.19.0+, Chrome 105, Safari 16.4, Firefox 106
		if (!("resolve" in import.meta)) {
			throw new Error("resolve: is not supported by your JavaScript environment.");
		}

		let resolved;
		try {
			resolved = fileURLToPath(import.meta.resolve(ref, relativeToFileUrl));
		} catch (e) {
			// Not resolvable in ESM, fallback to CommonJS
			const require = createRequire(relativeToFileUrl);
			resolved = require.resolve(ref);
		}

		if (!resolved) {
			throw new Error("Unable to resolve (via import.meta.resolve and require.resolve): " + ref);
		}

		return TemplatePath.relativePath(resolved);
	}

	getFilePathRelativeToProjectRoot(ref, contextFilePath) {
		if (this.isResolvePrefixed(ref)) {
			return this.resolvePrefixedPath(ref, contextFilePath);
		}

		let dir = TemplatePath.getDirFromFilePath(contextFilePath);
		return TemplatePath.join(dir, ref);
	}

	static getPrefixedFilename(fileRef, resolvedPath) {
		// TODO add option to set an output dir here
		// TODO add hex length option or option to change filename
		let extension = resolvedPath.split(".").pop();
		return createHashHexSync(fileRef).slice(-14) + `.${extension}`;
	}

	copy(fileRef, tmplInputPath, tmplOutputPath) {
		let original = fileRef;
		let isResolvePrefixed = this.isResolvePrefixed(original);

		// original ref is a full URL or no globs exist
		if (!isResolvePrefixed && this.isSkippableHref(original)) {
			return;
		}

		// Relative to source file’s input path
		let source = this.getFilePathRelativeToProjectRoot(fileRef, tmplInputPath);
		if (!this.isCopyableTarget(source)) {
			return;
		}

		if (!this.exists(source)) {
			// Try to alias using `options.paths`
			// No aliases on npm: paths
			let alias = !isResolvePrefixed && this.getAliasedPath(fileRef);
			if (!alias) {
				// always fail when not found and prefixed (npm: or copy: should fail when not found)
				if (isResolvePrefixed || this.#failOnError) {
					throw new Error(
						"Missing input file for `html-relative` Passthrough Copy file: " +
							TemplatePath.absolutePath(source),
					);
				}

				// don’t fail on error
				return;
			}

			source = alias;
		}

		if (isResolvePrefixed) {
			fileRef = HtmlRelativeCopy.getPrefixedFilename(original, source);
		}
		let target = this.getFilePathRelativeToProjectRoot(fileRef, tmplOutputPath);

		this.emit(source, target);

		// Return is used to transform the original reference in HTML (see HtmlRelativeCopyPlugin.js)
		if (isResolvePrefixed) {
			return {
				mode: "resolve",
				target,
			};
		}
	}

	emit(source, target) {
		// We use a Set here to allow passthrough copy manager to properly error on conflicts upstream
		// Only errors when different inputs write to the same output
		// Also errors if attempts to write outside the output folder.
		this.#userConfig.emit("eleventy#copy", {
			source,
			target,
			options: this.#copyOptions,
		});
	}
}

export { HtmlRelativeCopy };
