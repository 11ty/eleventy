export default function importer(relPath) {
	// TODO we could probably use a super streamlined version of import-module-string here that doesn’t support imports!
	throw new Error(
		"Dynamic import() not supported in this Eleventy reduced core bundle. This feature is available in the larger bundle.",
	);
}
