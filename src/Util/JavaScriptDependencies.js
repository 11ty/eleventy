import dependencyTree from "@11ty/dependency-tree";
import { find } from "@11ty/dependency-tree-esm";
import { TemplatePath } from "@11ty/eleventy-utils";

class JavaScriptDependencies {
	static async getDependencies(inputFiles, isProjectUsingEsm) {
		const depSet = new Set();

		// TODO does this need to work with aliasing? what other JS extensions will have deps?
		const commonJsFiles = inputFiles.filter(
			(file) => (!isProjectUsingEsm && file.endsWith(".js")) || file.endsWith(".cjs"),
		);

		for (const file of commonJsFiles) {
			const modules = dependencyTree(file, {
				nodeModuleNames: "exclude",
				allowNotFound: true,
			}).map((dependency) => {
				return TemplatePath.addLeadingDotSlash(TemplatePath.relativePath(dependency));
			});

			for (const dep of modules) {
				depSet.add(dep);
			}
		}

		const esmFiles = inputFiles.filter(
			(file) => (isProjectUsingEsm && file.endsWith(".js")) || file.endsWith(".mjs"),
		);
		for (const file of esmFiles) {
			const modules = await find(file);
			for (const dep of modules) {
				depSet.add(dep);
			}
		}

		return Array.from(depSet).sort();
	}
}

export default JavaScriptDependencies;
