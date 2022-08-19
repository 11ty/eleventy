import dependencyTree from "@11ty/dependency-tree";
import { TemplatePath } from "@11ty/eleventy-utils";

export default class JavaScriptDependencies {
  static async getDependencies(inputFiles, nodeModuleNamesOnly = false) {
    let depSet = new Set();

    // TODO does this need to work with aliasing? what other JS extensions will have deps?
    let filtered = inputFiles.filter((file) => file.endsWith(".cjs"));

    for (let file of filtered) {
      let modules = await dependencyTree(file, {
        nodeModuleNamesOnly,
        allowNotFound: true,
      });

      if (!nodeModuleNamesOnly) {
        modules = modules.map((dependency) => {
          return TemplatePath.addLeadingDotSlash(
            TemplatePath.relativePath(dependency)
          );
        });
      }

      for (let dep of modules) {
        depSet.add(dep);
      }
    }

    return Array.from(depSet).sort();
  }
}
