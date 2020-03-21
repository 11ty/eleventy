const lodashGet = require("lodash/get");
const lodashSet = require("lodash/set");
const DependencyGraph = require("dependency-graph").DepGraph;

class ComputedData {
  constructor() {
    this.computed = {};
    this.computedKeys = new Set();
    this.declaredDependencies = {};

    // is this ¯\_(lisp)_/¯
    // must be strings that won’t be escaped by template languages
    this.prefix = "(((((11ty(((((";
    this.suffix = ")))))11ty)))))";
  }

  add(key, fn, declaredDependencies = []) {
    this.computedKeys.add(key);
    this.declaredDependencies[key] = declaredDependencies;
    lodashSet(this.computed, key, fn);
  }

  getProxyData() {
    let proxyData = {};

    // use these special strings as a workaround to check the rendered output
    // can’t use proxies here as some template languages trigger proxy for all
    // keys in data
    for (let key of this.computedKeys) {
      // TODO don’t allow to set eleventyComputed.page? other disallowed computed things?
      lodashSet(proxyData, key, this.prefix + key + this.suffix);
    }

    return proxyData;
  }

  findVarsInOutput(output = "") {
    let vars = new Set();
    let splits = output.split(this.prefix);
    for (let split of splits) {
      let varName = split.substr(0, split.indexOf(this.suffix));
      if (varName) {
        vars.add(varName);
      }
    }
    return Array.from(vars);
  }

  async getVarOrder() {
    if (this.computedKeys.size > 0) {
      let graph = new DependencyGraph();

      let proxyData = this.getProxyData();

      for (let key of this.computedKeys) {
        let computed = lodashGet(this.computed, key);
        graph.addNode(key);

        if (typeof computed === "function") {
          if (this.declaredDependencies[key].length) {
            for (let dep of this.declaredDependencies[key]) {
              graph.addNode(dep);
              graph.addDependency(key, dep);
            }
          }

          // squelch console logs for this fake proxy data pass 😅
          let savedLog = console.log;
          console.log = () => {};
          let output = await computed(proxyData);
          console.log = savedLog;

          let vars = this.findVarsInOutput(output);
          for (let usesVar of vars) {
            if (usesVar !== key && this.computedKeys.has(usesVar)) {
              graph.addNode(usesVar);
              graph.addDependency(key, usesVar);
            }
          }
        }
      }

      return graph.overallOrder();
    }

    return [];
  }

  async setupData(data) {
    let order = await this.getVarOrder();
    for (let key of order) {
      let computed = lodashGet(this.computed, key);

      if (typeof computed === "function") {
        lodashSet(data, key, await computed(data));
      } else if (computed !== undefined) {
        lodashSet(data, key, computed);
      }
    }
  }
}

module.exports = ComputedData;
