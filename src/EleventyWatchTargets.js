const dependencyTree = require("dependency-tree");
const TemplatePath = require("./TemplatePath");

class EleventyWatchTargets {
  constructor() {
    this.targets = new Set();
    this.dependencies = new Set();
    this.newTargets = new Set();
    this._watchJavaScriptDependencies = true;
  }

  set watchJavaScriptDependencies(watch) {
    this._watchJavaScriptDependencies = !!watch;
  }

  get watchJavaScriptDependencies() {
    return this._watchJavaScriptDependencies;
  }

  _normalizeTargets(targets) {
    if (!targets) {
      return [];
    } else if (Array.isArray(targets)) {
      return targets;
    }

    return [targets];
  }

  reset() {
    this.newTargets = new Set();
  }

  isWatched(target) {
    return this.targets.has(target);
  }

  addRaw(targets, isDependency) {
    for (let target of targets) {
      let path = TemplatePath.addLeadingDotSlash(target);
      if (!this.isWatched(path)) {
        this.newTargets.add(path);
      }

      this.targets.add(path);

      if (isDependency) {
        this.dependencies.add(path);
      }
    }
  }

  // add only a target
  add(targets) {
    targets = this._normalizeTargets(targets);
    this.addRaw(targets);
  }

  // add only a target’s dependencies
  addDependencies(targets, filterCallback) {
    if (!this.watchJavaScriptDependencies) {
      return;
    }

    targets = this._normalizeTargets(targets);

    let deps = this.getJavaScriptDependenciesFromList(targets);
    if (filterCallback) {
      deps = deps.filter(filterCallback);
    }

    this.addRaw(deps, true);
  }

  setWriter(templateWriter) {
    this.writer = templateWriter;
  }

  getJavaScriptDependenciesFromList(files = []) {
    let depSet = new Set();
    files
      .filter(file => file.endsWith(".js")) // TODO does this need to work with aliasing? what other JS extensions will have deps?
      .forEach(file => {
        dependencyTree
          .toList({
            filename: file,
            directory: TemplatePath.absolutePath(),
            filter: function(path) {
              return path.indexOf("node_modules") === -1;
            }
          })
          .map(dependency => {
            return TemplatePath.addLeadingDotSlash(
              TemplatePath.relativePath(dependency)
            );
          })
          .filter(dependency => {
            return (
              dependency !== file && dependency.indexOf("node_modules") === -1
            );
          })
          .forEach(dependency => {
            depSet.add(dependency);
          });
      });

    return Array.from(depSet);
  }

  clearDependencyRequireCache() {
    for (let path of this.dependencies) {
      delete require.cache[TemplatePath.absolutePath(path)];
    }
  }

  getNewTargetsSinceLastReset() {
    return Array.from(this.newTargets);
  }

  getTargets() {
    return Array.from(this.targets);
  }
}

module.exports = EleventyWatchTargets;
