import picomatch from "picomatch";
import { TemplatePath } from "@11ty/eleventy-utils";

function isGlobMatch(filepath, globs = [], options = undefined) {
	if (!filepath || !Array.isArray(globs) || globs.length === 0) {
		return false;
	}

	let inputPath = TemplatePath.stripLeadingDotSlash(filepath);
	let opts = Object.assign(
		{
			dot: true,
			nocase: true, // insensitive
		},
		options,
	);

	// globs: string or array of strings
	return picomatch.isMatch(inputPath, globs, opts);
}

export { isGlobMatch };
