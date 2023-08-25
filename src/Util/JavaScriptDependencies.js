const dependencyTree = require("@11ty/dependency-tree");
const { find } = require("@11ty/dependency-tree-esm");
const { TemplatePath } = require("@11ty/eleventy-utils");

class JavaScriptDependencies {
  static async getDependencies(inputFiles, isProjectUsingEsm) {
    let depSet = new Set();

    // TODO does this need to work with aliasing? what other JS extensions will have deps?
    let commonJsFiles = inputFiles.filter(
      (file) => (!isProjectUsingEsm && file.endsWith(".js")) || file.endsWith(".cjs")
    );

    for (let file of commonJsFiles) {
      let modules = dependencyTree(file, {
        nodeModuleNames: "exclude",
        allowNotFound: true,
      }).map((dependency) => {
        return TemplatePath.addLeadingDotSlash(TemplatePath.relativePath(dependency));
      });

      for (let dep of modules) {
        depSet.add(dep);
      }
    }

    let esmFiles = inputFiles.filter(
      (file) => (isProjectUsingEsm && file.endsWith(".js")) || file.endsWith(".mjs")
    );
    for (let file of esmFiles) {
      let modules = await find(file);
      for (let dep of modules) {
        depSet.add(dep);
      }
    }

    return Array.from(depSet).sort();
  }
}

module.exports = JavaScriptDependencies;
