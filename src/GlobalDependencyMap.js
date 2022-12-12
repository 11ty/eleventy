const { DepGraph } = require("dependency-graph");
const { TemplatePath } = require("@11ty/eleventy-utils");

const PathNormalizer = require("./Util/PathNormalizer");
const eventBus = require("./EventBus.js");

// TODO extend this to built-in template types, this is only used by Custom templates for now

class GlobalDependencyMap {
  constructor() {
    eventBus.on("eleventy.compileCacheReset", () => {
      this._map = undefined;
    });
  }

  get map() {
    if (!this._map) {
      this._map = new DepGraph({ circular: true });
    }

    return this._map;
  }

  normalizeNode(node) {
    if (!node) {
      return;
    }
    if (typeof node !== "string") {
      throw new Error(
        "`addDependencies` files must be strings. Received:" + node
      );
    }

    // Paths should not be absolute (we convert absolute paths to relative)
    // Paths should not have a leading dot slash
    // Paths should always be `/` independent of OS path separator
    return TemplatePath.stripLeadingDotSlash(
      PathNormalizer.normalizeSeperator(TemplatePath.relativePath(node))
    );
  }

  delete(node) {
    node = this.normalizeNode(node);

    if (this.map.hasNode(node)) {
      this.map.removeNode(node);
    }
  }

  getDependencies(node) {
    node = this.normalizeNode(node);

    if (!this.map.hasNode(node)) {
      return false;
    }

    return this.map.dependenciesOf(node);
  }

  addDependency(from, toArray = []) {
    from = this.normalizeNode(from);

    // reset any existing for this node
    this.delete(from);

    this.map.addNode(from);

    for (let to of toArray) {
      to = this.normalizeNode(to);

      if (!this.map.hasNode(to)) {
        this.map.addNode(to);
      }

      this.map.addDependency(from, to);
    }
  }

  hasDependency(from, to) {
    to = this.normalizeNode(to);

    let deps = this.getDependencies(from); // normalizes `from`

    if (!deps) {
      return false;
    }

    return deps.includes(to);
  }

  isFileRelevantTo(fullTemplateInputPath, comparisonFile) {
    fullTemplateInputPath = this.normalizeNode(fullTemplateInputPath);
    comparisonFile = this.normalizeNode(comparisonFile);

    // No watch/serve changed file
    if (!comparisonFile) {
      return false;
    }
    // The file that changed is the relevant file
    if (fullTemplateInputPath === comparisonFile) {
      return true;
    }
    // The file that changed is a dependency of the template
    if (this.hasDependency(fullTemplateInputPath, comparisonFile)) {
      return true;
    }
    return false;
  }
}

module.exports = GlobalDependencyMap;
