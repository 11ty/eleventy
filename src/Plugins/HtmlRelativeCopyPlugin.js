import fs from "node:fs";
import path from "node:path";
import { HtmlRelativeCopy } from "../Util/HtmlRelativeCopy.js";

// https://github.com/11ty/eleventy/pull/3573
function readJsonIfExists(fp) {
	try {
		if (fs.existsSync(fp)) {
			const txt = fs.readFileSync(fp, "utf8");
			return JSON.parse(txt);
		}
	} catch (e) {
		throw e;
	}
}

function findEleventyCopyFromDirectoryData(inputPath) {
	// Walk up from the template's directory.
	// At each dir, try:
	//   <dir>/<basename(dir)>.json
	//   <dir>/<basename(dir)>.11tydata.json
	// If any contains { eleventyCopy: ... }, collect them (nearest wins last).
	const hits = [];
	let dir = path.dirname(inputPath);

	// Stop at filesystem root
	while (dir && dir !== path.dirname(dir)) {
		const base = path.basename(dir);
		const candidates = [path.join(dir, `${base}.json`), path.join(dir, `${base}.11tydata.json`)];

		for (const fp of candidates) {
			const data = readJsonIfExists(fp);
			if (data && Object.prototype.hasOwnProperty.call(data, "eleventyCopy")) {
				hits.push(data.eleventyCopy);
			}
		}

		dir = path.dirname(dir);
	}

	if (!hits.length) return undefined;

	// Merge shallowly into an array
	const out = [];
	for (const h of hits) {
		if (Array.isArray(h)) out.push(...h);
		else if (typeof h === "string") out.push(h);
	}
	return out.length ? out : undefined;
}

// one HtmlRelativeCopy instance per entry
function init(eleventyConfig, options) {
	if (!eleventyConfig.htmlTransformer) {
		throw new Error(
			"html-relative Passthrough Copy requires eleventyConfig.htmlTransformer support. Are you using the `@11ty/client` bundle? If so, try the `@11ty/client/eleventy` bundle instead.",
		);
	}

	let opts = Object.assign(
		{
			extensions: "html",
			match: false, // can be one glob string or an array of globs
			paths: [], // directories to also look in for files
			failOnError: true, // fails when a path matches (via `match`) but not found on file system
			copyOptions: undefined,
		},
		options,
	);

	let htmlrel = new HtmlRelativeCopy();
	htmlrel.setUserConfig(eleventyConfig);
	htmlrel.addMatchingGlob(opts.match);
	htmlrel.setFailOnError(opts.failOnError);
	htmlrel.setCopyOptions(opts.copyOptions);
	htmlrel.addPaths(opts.paths);

	// run once per output page (the url transform fires many times per page)
	const processedOncePerOutput = new Set();

	eleventyConfig.htmlTransformer.addUrlTransform(
		opts.extensions,
		function (targetFilepathOrUrl) {
			// @ts-ignore
			const pageInput = this?.page?.inputPath;
			// @ts-ignore
			const pageOutput = this?.page?.outputPath;

			// Regular html-relative behavior
			try {
				// @ts-ignore
				htmlrel.copy(targetFilepathOrUrl, pageInput, pageOutput);
			} catch (e) {
				if (opts.failOnError) throw e;
			}

			// Data-cascade: run exactly once per output page
			try {
				const outKey = pageOutput || this?.page?.url || "";
				if (!outKey || processedOncePerOutput.has(outKey)) {
					return targetFilepathOrUrl;
				}
				processedOncePerOutput.add(outKey);

				// Try a few places for eleventyCopy on the transform context (sometimes present)
				const fromContext =
					// @ts-ignore
					this?.eleventyCopy ||
					// @ts-ignore
					this?.page?.eleventyCopy ||
					// @ts-ignore
					this?.eleventy?.data?.eleventyCopy ||
					// @ts-ignore
					this?.page?.data?.eleventyCopy;

				let globs = fromContext;
				if (!globs) {
					// Fallback: read directory data files ourselves (e.g., blog/blog.json)
					globs = findEleventyCopyFromDirectoryData(pageInput);
				}

				if (globs) {
					try {
						htmlrel.copyFromDataCascade(globs, pageInput, pageOutput);
					} catch (innerErr) {
						if (opts.failOnError) throw innerErr;
					}
				}
			} catch (outerErr) {
				if (opts.failOnError) throw outerErr;
			}

			// TODO front matter option for manual copy
			return targetFilepathOrUrl;
		},
		{
			enabled: () => htmlrel.isEnabled(),
			// - MUST run after other plugins but BEFORE HtmlBase plugin
			priority: -1,
		},
	);
}

function HtmlRelativeCopyPlugin(eleventyConfig) {
	// Important: if this is empty, no URL transforms are added
	for (let options of eleventyConfig.passthroughCopiesHtmlRelative) {
		init(eleventyConfig, options);
	}
}

Object.defineProperty(HtmlRelativeCopyPlugin, "eleventyPackage", {
	value: "@11ty/eleventy/html-relative-copy-plugin",
});

export { HtmlRelativeCopyPlugin };
