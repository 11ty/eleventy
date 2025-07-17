import { RetrieveGlobals as NodeRetrieveGlobals } from "node-retrieve-globals";
import { parseCode, walkCode, importFromString } from "import-module-string";
import { isBuiltin } from "node:module";

export async function RetrieveGlobals(code, filePath) {
	let data = {
		page: {
			// Theoretically fileSlug and filePathStem could be added here but require extensionMap
			inputPath: filePath,
		},
	};

	let ast = parseCode(code);
	let { imports } = walkCode(ast);

	let nonBuiltinImports = Array.from(imports).filter((name) => !isBuiltin(name));
	if (nonBuiltinImports.length === 0) {
		return importFromString(code, { ast, data, filePath });
	}

	// TODO re-use already parsed AST from `import-module-string` in `node-retrieve-globals`
	let vm = new NodeRetrieveGlobals(code, {
		filePath,
		// ignored if vm.Module is stable (or --experimental-vm-modules)
		transformEsmImports: true,
	});

	// Future warning until vm.Module is stable:
	// If the frontMatterCode uses `import` this uses the `experimentalModuleApi`
	// option in node-retrieve-globals to workaround https://github.com/zachleat/node-retrieve-globals/issues/2

	// this is async, but it’s handled in Eleventy upstream.
	return vm.getGlobalContext(data, {
		reuseGlobal: true,
		dynamicImport: true,
		// addRequire: true,
	});
}
