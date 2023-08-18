const dependencyTree = require("@11ty/dependency-tree");
const { TemplatePath } = require("@11ty/eleventy-utils");

class JavaScriptDependencies {
  static getDependencies(inputFiles) {
    let depSet = new Set();

    // TODO does this need to work with aliasing? what other JS extensions will have deps?
    let filtered = inputFiles.filter((file) => file.endsWith(".js") || file.endsWith(".cjs"));

    for (let file of filtered) {
      let modules = dependencyTree(file, {
        nodeModuleNamesOnly: false,
        allowNotFound: true,
      }).map((dependency) => {
        return TemplatePath.addLeadingDotSlash(TemplatePath.relativePath(dependency));
      });

      for (let dep of modules) {
        depSet.add(dep);
      }
    }

    return Array.from(depSet).sort();
  }
}

module.exports = JavaScriptDependencies;
