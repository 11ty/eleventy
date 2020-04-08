const { performance } = require("perf_hooks");

class Benchmark {
  constructor() {
    this.reset();
  }

  getNewTimestamp() {
    if (performance) {
      return performance.now();
    }
    return new Date().getTime();
  }

  reset() {
    this.timeSpent = 0;
    this.timesCalled = 0;
    this.beforeTimers = [];
  }

  before() {
    this.timesCalled++;
    this.beforeTimers.push(this.getNewTimestamp());
  }

  after() {
    if (!this.beforeTimers.length) {
      throw new Error("You called Benchmark after() without a before().");
    }

    let before = this.beforeTimers.pop();
    if (!this.beforeTimers.length) {
      this.timeSpent += this.getNewTimestamp() - before;
    }
  }

  getTimesCalled() {
    return this.timesCalled;
  }

  getTotal() {
    return this.timeSpent;
  }
}

module.exports = Benchmark;
