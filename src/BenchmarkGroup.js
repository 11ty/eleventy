const chalk = require("chalk");

const Benchmark = require("./Benchmark");
const debugWarn = require("debug")("Eleventy:Warnings");

class BenchmarkGroup {
  constructor() {
    this.benchmarks = {};
    this.start = new Date();
    this.isVerbose = true;
  }

  reset() {
    this.start = new Date();

    for (var type in this.benchmarks) {
      this.benchmarks[type].reset();
    }
  }

  // TODO make this async
  add(type, callback) {
    let benchmark = (this.benchmarks[type] = new Benchmark());

    return function(...args) {
      benchmark.before();
      let ret = callback.call(this, ...args);
      benchmark.after();
      return ret;
    };
  }

  get(type) {
    this.benchmarks[type] = new Benchmark();
    return this.benchmarks[type];
  }

  finish(location, thresholdPercent, isVerbose) {
    let totalTimeSpent = new Date().getTime() - this.start.getTime();
    thresholdPercent = thresholdPercent || 10;
    for (var type in this.benchmarks) {
      let bench = this.benchmarks[type];
      let totalForBenchmark = bench.getTotal();
      let percent = (totalForBenchmark * 100) / totalTimeSpent;
      if (percent > thresholdPercent) {
        let str = chalk.yellow(
          `Benchmark (${location}): ${type} took ${bench.getTotal()}ms (${percent.toFixed(
            1
          )}%)`
        );
        if (isVerbose) {
          console.log(str);
        }

        debugWarn(str);
      }
    }
  }
}

module.exports = BenchmarkGroup;
