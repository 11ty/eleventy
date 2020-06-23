const dependencyTree = require("@11ty/dependency-tree");
const TemplatePath = require("./TemplatePath");
const deleteRequireCache = require("./Util/DeleteRequireCache");

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

  isJavaScriptDependency(path) {
    return this.dependencies.has(path);
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

  addAndMakeGlob(targets) {
    targets = this._normalizeTargets(targets).map(entry =>
      TemplatePath.convertToRecursiveGlobSync(entry)
    );
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
      .filter(file => file.endsWith(".js") || file.endsWith(".cjs")) // TODO does this need to work with aliasing? what other JS extensions will have deps?
      .forEach(file => {
        dependencyTree(file, { allowNotFound: true })
          .map(dependency => {
            return TemplatePath.addLeadingDotSlash(
              TemplatePath.relativePath(dependency)
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
      deleteRequireCache(TemplatePath.absolutePath(path));
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
