const lodashGet = require("lodash/get");
const lodashSet = require("lodash/set");
const DependencyGraph = require("dependency-graph").DepGraph;

const ComputedDataTemplateString = require("./ComputedDataTemplateString");
const ComputedDataProxy = require("./ComputedDataProxy");

// const debug = require("debug")("Eleventy:ComputedData");

class ComputedData {
  constructor() {
    this.computed = {};
    this.templateStringKeyLookup = {};
    this.computedKeys = new Set();
    this.declaredDependencies = {};
  }

  add(key, fn, declaredDependencies = []) {
    this.computedKeys.add(key);
    this.declaredDependencies[key] = declaredDependencies;

    lodashSet(this.computed, key, fn);
  }

  addTemplateString(key, fn, declaredDependencies = []) {
    this.add(key, fn, declaredDependencies);
    this.templateStringKeyLookup[key] = true;
  }

  async getVarOrder() {
    if (this.computedKeys.size > 0) {
      let graph = new DependencyGraph();

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

          let varsUsed;
          let proxy;
          let isTemplateString = !!this.templateStringKeyLookup[key];
          if (isTemplateString) {
            proxy = new ComputedDataTemplateString(this.computedKeys);
          } else {
            proxy = new ComputedDataProxy(this.computedKeys);
          }
          varsUsed = await proxy.findVarsUsed(computed);

          for (let varUsed of varsUsed) {
            if (varUsed !== key && this.computedKeys.has(varUsed)) {
              graph.addNode(varUsed);
              graph.addDependency(key, varUsed);
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
