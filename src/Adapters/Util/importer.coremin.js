export default function importer(relPath) {
	// TODO we could probably use a super streamlined version of import-module-string here that doesn’t support imports!
	throw new Error(
		"Dynamic import() is not supported in the Eleventy minimal browser bundle. Use the standard Eleventy browser bundle instead.",
	);
}
