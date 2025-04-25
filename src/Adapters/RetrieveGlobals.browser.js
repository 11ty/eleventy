export async function RetrieveGlobals(code, filePath) {
	throw new Error(
		"The `js` front matter type (using node-retrieve-globals for arbitrary JavaScript) is not yet supported in browser. Try using a JavaScript object {} instead!",
	);
}
