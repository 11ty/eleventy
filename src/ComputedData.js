const lodashGet = require("lodash/get");
const lodashSet = require("lodash/set");

const ComputedDataQueue = require("./ComputedDataQueue");
const ComputedDataTemplateString = require("./ComputedDataTemplateString");
const ComputedDataProxy = require("./ComputedDataProxy");

const debug = require("debug")("Eleventy:ComputedData");

class ComputedData {
  constructor() {
    this.computed = {};
    this.templateStringKeyLookup = {};
    this.computedKeys = new Set();
    this.declaredDependencies = {};
    this.queue = new ComputedDataQueue();
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

  async resolveVarOrder(data) {
    for (let key of this.computedKeys) {
      let computed = lodashGet(this.computed, key);

      if (typeof computed !== "function") {
        // add nodes for non functions (primitives like booleans, etc)
        this.queue.addNode(key);
      } else {
        this.queue.uses(key, this.declaredDependencies[key]);

        let proxy;
        let isTemplateString = !!this.templateStringKeyLookup[key];
        // TODO move this out of the loop??
        if (isTemplateString) {
          proxy = new ComputedDataTemplateString(this.computedKeys);
        } else {
          proxy = new ComputedDataProxy(this.computedKeys);
        }

        let varsUsed = await proxy.findVarsUsed(computed, data);
        debug("%o accesses %o variables", key, varsUsed);
        let filteredVarsUsed = varsUsed.filter(varUsed => {
          return (
            (varUsed !== key && this.computedKeys.has(varUsed)) ||
            varUsed.startsWith("collections.")
          );
        });
        this.queue.uses(key, filteredVarsUsed);
      }
    }
  }

  async _setupDataEntry(data, order) {
    debug("Computed data order of execution: %o", order);

    for (let key of order) {
      let computed = lodashGet(this.computed, key);

      if (typeof computed === "function") {
        lodashSet(data, key, await computed(data));
      } else if (computed !== undefined) {
        lodashSet(data, key, computed);
      }
    }
  }

  async setupData(data, orderFilter) {
    await this.resolveVarOrder(data);

    // process all variables
    let order = this.queue.getOrder();
    if (orderFilter && typeof orderFilter === "function") {
      order = order.filter(orderFilter.bind(this.queue));
    }
    await this._setupDataEntry(data, order);
    this.queue.markComputed(order);
  }
}

module.exports = ComputedData;
