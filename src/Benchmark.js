class Benchmark {
  constructor() {
    this.reset();
  }

  reset() {
    this.timeSpent = 0;
    this.timesCalled = 0;
    this.beforeDates = [];
  }

  before() {
    this.timesCalled++;
    this.beforeDates.push(new Date());
  }

  after() {
    if (!this.beforeDates.length) {
      throw new Error("You called Benchmark after() without a before().");
    }

    let before = this.beforeDates.pop();
    if (!this.beforeDates.length) {
      this.timeSpent += new Date().getTime() - before.getTime();
    }
  }

  getTimesCalled() {
    return this.timesCalled;
  }

  getTotal() {
    return this.timeSpent;
  }

  getTotalString() {
    return this.timeSpent > 0 ? ` (${this.timeSpent}ms)` : "";
  }
}

module.exports = Benchmark;
