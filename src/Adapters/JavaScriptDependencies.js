import dependencyTree from "@11ty/dependency-tree";
import { find } from "@11ty/dependency-tree-esm";
import { TemplatePath } from "@11ty/eleventy-utils";

import EleventyBaseError from "../Errors/EleventyBaseError.js";

class JavaScriptDependencies {
	static getErrorMessage(file, type) {
		return `A problem was encountered looking for JavaScript dependencies in ${type} file: ${file}. This only affects --watch and --serve behavior and does not affect your build.`;
	}

	static async getDependencies(inputFiles, isProjectUsingEsm) {
		let depSet = new Set();

		// TODO does this need to work with aliasing? what other JS extensions will have deps?
		let commonJsFiles = inputFiles.filter(
			(file) => (!isProjectUsingEsm && file.endsWith(".js")) || file.endsWith(".cjs"),
		);

		for (let file of commonJsFiles) {
			try {
				let modules = dependencyTree(file, {
					nodeModuleNames: "exclude",
					allowNotFound: true,
				}).map((dependency) => {
					return TemplatePath.addLeadingDotSlash(TemplatePath.relativePath(dependency));
				});

				for (let dep of modules) {
					depSet.add(dep);
				}
			} catch (e) {
				throw new EleventyBaseError(this.getErrorMessage(file, "CommonJS"), e);
			}
		}

		let esmFiles = inputFiles.filter(
			(file) => (isProjectUsingEsm && file.endsWith(".js")) || file.endsWith(".mjs"),
		);
		for (let file of esmFiles) {
			try {
				let modules = await find(file);
				for (let dep of modules) {
					depSet.add(dep);
				}
			} catch (e) {
				throw new EleventyBaseError(this.getErrorMessage(file, "ESM"), e);
			}
		}

		return Array.from(depSet).sort();
	}
}

export default JavaScriptDependencies;
