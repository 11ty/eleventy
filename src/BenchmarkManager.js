const BenchmarkGroup = require("./BenchmarkGroup");

class BenchmarkManager {
  constructor() {
    this.benches = {};
    this.isVerbose = true;
  }

  reset() {
    for (var j in this.benches) {
      this.benches[j].reset();
    }
  }

  setVerboseOutput(isVerbose) {
    this.isVerbose = !!isVerbose;
  }

  getBenchmarkGroup(name) {
    if (!this.benches[name]) {
      this.benches[name] = new BenchmarkGroup();
    }

    return this.benches[name];
  }

  getAll() {
    return this.benches;
  }

  get(name) {
    if (name) {
      return this.getBenchmarkGroup(name);
    }

    return this.getAll();
  }

  finish(thresholdPercent) {
    for (var j in this.benches) {
      this.benches[j].finish(j, thresholdPercent, this.isVerbose);
    }
  }
}

let manager = new BenchmarkManager();
module.exports = manager;
