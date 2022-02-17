const ConsoleLogger = require("./Util/ConsoleLogger");
const Benchmark = require("./Benchmark");
const debugBenchmark = require("debug")("Eleventy:Benchmark");

class BenchmarkGroup {
  constructor() {
    this.benchmarks = {};
    // Warning: aggregate benchmarks automatically default to false via BenchmarkManager->getBenchmarkGroup
    this.isVerbose = true;
    this.logger = new ConsoleLogger(this.isVerbose);
    this.minimumThresholdMs = 0;
    this.minimumThresholdPercent = 8;
  }

  setIsVerbose(isVerbose) {
    this.isVerbose = isVerbose;
    this.logger.isVerbose = isVerbose;
  }

  reset() {
    for (var type in this.benchmarks) {
      this.benchmarks[type].reset();
    }
  }

  // TODO use addAsync everywhere instead
  add(type, callback) {
    let benchmark = (this.benchmarks[type] = new Benchmark());

    return function (...args) {
      benchmark.before();
      let ret = callback.call(this, ...args);
      benchmark.after();
      return ret;
    };
  }

  // callback must return a promise
  // async addAsync(type, callback) {
  //   let benchmark = (this.benchmarks[type] = new Benchmark());

  //   benchmark.before();
  //   // don’t await here.
  //   let promise = callback.call(this);
  //   promise.then(function() {
  //     benchmark.after();
  //   });
  //   return promise;
  // }

  setMinimumThresholdMs(minimumThresholdMs) {
    let val = parseInt(minimumThresholdMs, 10);
    if (isNaN(val)) {
      throw new Error("`setMinimumThresholdMs` expects a number argument.");
    }
    this.minimumThresholdMs = val;
  }

  setMinimumThresholdPercent(minimumThresholdPercent) {
    let val = parseInt(minimumThresholdPercent, 10);
    if (isNaN(val)) {
      throw new Error(
        "`setMinimumThresholdPercent` expects a number argument."
      );
    }
    this.minimumThresholdPercent = val;
  }

  has(type) {
    return !!this.benchmarks[type];
  }

  get(type) {
    if (!this.benchmarks[type]) {
      this.benchmarks[type] = new Benchmark();
    }
    return this.benchmarks[type];
  }

  padNumber(num, length) {
    if (("" + num).length >= length) {
      return num;
    }

    let prefix = new Array(length + 1).join(" ");
    return (prefix + num).substr(-1 * length);
  }

  finish(label, totalTimeSpent) {
    for (var type in this.benchmarks) {
      let bench = this.benchmarks[type];
      let isAbsoluteMinimumComparison = this.minimumThresholdMs > 0;
      let totalForBenchmark = bench.getTotal();
      let percent = Math.round((totalForBenchmark * 100) / totalTimeSpent);

      let output = {
        ms: this.padNumber(totalForBenchmark.toFixed(0), 6),
        percent: this.padNumber(percent, 3),
        calls: this.padNumber(bench.getTimesCalled(), 5),
      };
      let str = `Benchmark ${output.ms}ms ${output.percent}% ${output.calls}× (${label}) ${type}`;

      if (
        (isAbsoluteMinimumComparison &&
          totalForBenchmark >= this.minimumThresholdMs) ||
        percent > this.minimumThresholdPercent
      ) {
        this.logger.warn(str);
      }

      if (totalForBenchmark.toFixed(0) > 0) {
        debugBenchmark(str);
      }
    }
  }
}

module.exports = BenchmarkGroup;
