export async function RetrieveGlobals(code, filePath) {
	let target = `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
	return import(target).then((result) => {
		if (Object.keys(result).length === 0) {
			console.warn(
				`Arbitrary JavaScript front matter expects the use of \`export\` when used in Eleventy minimal browser bundle (${filePath}). You may want to use the standard Eleventy browser bundle instead.`,
			);
		}
		return result;
	});
}
