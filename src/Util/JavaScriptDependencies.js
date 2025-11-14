import dependencyTree from "@11ty/dependency-tree";
import { find, findGraph, mergeGraphs } from "@11ty/dependency-tree-esm";
import { TemplatePath } from "@11ty/eleventy-utils";
import { DepGraph } from "dependency-graph";

import { union } from "./SetUtil.js";
import EleventyBaseError from "../Errors/EleventyBaseError.js";

class JavaScriptDependencies {
	static getErrorMessage(file, type) {
		return `A problem was encountered looking for JavaScript dependencies in ${type} file: ${file}. This only affects --watch and --serve behavior and does not affect your build.`;
	}

	static async getCommonJsDependencies(inputFiles, isProjectUsingEsm) {
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

		return depSet;
	}

	static async getEsmDependencies(inputFiles, isProjectUsingEsm) {
		let depSet = new Set();

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

		return depSet;
	}

	static async getDependencies(inputFiles, isProjectUsingEsm) {
		let cjs = await this.getCommonJsDependencies(inputFiles, isProjectUsingEsm);
		let esm = await this.getEsmDependencies(inputFiles, isProjectUsingEsm);
		return Array.from(union(cjs, esm));
	}

	static async getEsmGraph(inputFiles, isProjectUsingEsm) {
		let rootGraph = new DepGraph();
		let esmFiles = inputFiles.filter(
			(file) => (isProjectUsingEsm && file.endsWith(".js")) || file.endsWith(".mjs"),
		);
		for (let file of esmFiles) {
			try {
				let graph = await findGraph(file);

				mergeGraphs(rootGraph, graph);
			} catch (e) {
				throw new EleventyBaseError(this.getErrorMessage(file, "ESM"), e);
			}
		}

		return rootGraph;
	}
}

export default JavaScriptDependencies;
