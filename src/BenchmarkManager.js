const BenchmarkGroup = require("./BenchmarkGroup");
const { performance } = require("perf_hooks");

// TODO this should not be a singleton, it belongs in the config or somewhere on the Eleventy instance.

class BenchmarkManager {
  constructor() {
    this.benchmarkGroups = {};
    this.isVerbose = true;
    this.start = this.getNewTimestamp();
  }

  reset() {
    this.start = this.getNewTimestamp();

    for (var j in this.benchmarkGroups) {
      this.benchmarkGroups[j].reset();
    }
  }

  getNewTimestamp() {
    if (performance) {
      return performance.now();
    }
    return new Date().getTime();
  }

  setVerboseOutput(isVerbose) {
    this.isVerbose = !!isVerbose;
  }

  hasBenchmarkGroup(name) {
    return name in this.benchmarkGroups;
  }

  getBenchmarkGroup(name) {
    if (!this.benchmarkGroups[name]) {
      this.benchmarkGroups[name] = new BenchmarkGroup();

      // Special behavior for aggregate benchmarks
      // so they don’t console.log every time
      if (name === "Aggregate") {
        this.benchmarkGroups[name].setIsVerbose(false);
      } else {
        this.benchmarkGroups[name].setIsVerbose(this.isVerbose);
      }
    }

    return this.benchmarkGroups[name];
  }

  getAll() {
    return this.benchmarkGroups;
  }

  get(name) {
    if (name) {
      return this.getBenchmarkGroup(name);
    }

    return this.getAll();
  }

  finish() {
    let totalTimeSpentBenchmarking = this.getNewTimestamp() - this.start;
    for (var j in this.benchmarkGroups) {
      this.benchmarkGroups[j].finish(j, totalTimeSpentBenchmarking);
    }
  }
}

module.exports = BenchmarkManager;
