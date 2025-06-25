export function isGlobMatch(filepath, globs = [], options = undefined) {
	throw new Error(
		"Glob matching (e.g. getFilteredByGlob collection API method) is not supported in the minimal Eleventy browser bundle. Use the standard Eleventy browser bundle instead.",
	);
}

// only used when using a glob as an input (see ProjectDirectories)
export function isDynamicPattern(pattern) {
	return false;
}
