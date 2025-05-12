export function isGlobMatch(filepath, globs = [], options = undefined) {
	throw new Error(
		"configurationApi.getFilteredByGlob method is not supported in this bundle of Eleventy.",
	);
}

// only used when using a glob as an input (see ProjectDirectories)
export function isDynamicPattern(pattern) {
	return false;
}
