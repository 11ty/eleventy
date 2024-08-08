import micromatch from "micromatch";
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

	return micromatch.isMatch(inputPath, globs, opts);
}

export { isGlobMatch };
