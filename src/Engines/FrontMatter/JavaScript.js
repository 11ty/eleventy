import { RetrieveGlobals } from "node-retrieve-globals";

// `javascript` Front Matter Type
export default function (frontMatterCode, context = {}) {
	let { filePath } = context;

	// context.language would be nice as a guard, but was unreliable
	if (frontMatterCode.trimStart().startsWith("{")) {
		return context.engines.jsLegacy.parse(frontMatterCode, context);
	}

	let vm = new RetrieveGlobals(frontMatterCode, {
		filePath,
		// ignored if vm.Module is stable (or --experimental-vm-modules)
		transformEsmImports: true,
	});

	// Future warning until vm.Module is stable:
	// If the frontMatterCode uses `import` this uses the `experimentalModuleApi`
	// option in node-retrieve-globals to workaround https://github.com/zachleat/node-retrieve-globals/issues/2
	let data = {
		page: {
			// Theoretically fileSlug and filePathStem could be added here but require extensionMap
			inputPath: filePath,
		},
	};

	// this is async, but it’s handled in Eleventy upstream.
	return vm.getGlobalContext(data, {
		reuseGlobal: true,
		dynamicImport: true,
		// addRequire: true,
	});
}
