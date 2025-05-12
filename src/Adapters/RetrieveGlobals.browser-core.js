export async function RetrieveGlobals(code, filePath) {
	// TODO we could probably use a super streamlined version of import-module-string here that doesn’t support imports!
	throw new Error(
		"Arbitrary js not supported in this Eleventy reduced core bundle. This feature is available in the larger bundle.",
	);
}
