import debugUtil from "debug";

import ConsoleLogger from "./Util/ConsoleLogger.js";
import Benchmark from "./Benchmark.js";

const debugBenchmark = debugUtil("Eleventy:Benchmark");

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
		const benchmark = (this.benchmarks[type] = new Benchmark());

		return function (...args) {
			benchmark.before();
			const ret = callback.call(this, ...args);
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
		const val = parseInt(minimumThresholdMs, 10);
		if (isNaN(val)) {
			throw new Error("`setMinimumThresholdMs` expects a number argument.");
		}
		this.minimumThresholdMs = val;
	}

	setMinimumThresholdPercent(minimumThresholdPercent) {
		const val = parseInt(minimumThresholdPercent, 10);
		if (isNaN(val)) {
			throw new Error("`setMinimumThresholdPercent` expects a number argument.");
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

		const prefix = new Array(length + 1).join(" ");
		return (prefix + num).substr(-1 * length);
	}

	finish(label, totalTimeSpent) {
		for (var type in this.benchmarks) {
			const bench = this.benchmarks[type];
			const isAbsoluteMinimumComparison = this.minimumThresholdMs > 0;
			const totalForBenchmark = bench.getTotal();
			const percent = Math.round((totalForBenchmark * 100) / totalTimeSpent);
			const callCount = bench.getTimesCalled();

			const output = {
				ms: this.padNumber(totalForBenchmark.toFixed(0), 6),
				percent: this.padNumber(percent, 3),
				calls: this.padNumber(callCount, 5),
			};
			const str = `Benchmark ${output.ms}ms ${output.percent}% ${output.calls}× (${label}) ${type}`;

			if (
				(isAbsoluteMinimumComparison && totalForBenchmark >= this.minimumThresholdMs) ||
				percent > this.minimumThresholdPercent
			) {
				this.logger.warn(str);
			}

			// Opt out of logging if low count (1× or 2×) or 0ms / 1%
			if (
				callCount > 1 || // called more than once
				totalForBenchmark.toFixed(0) > 0 // more than 0ms
			) {
				debugBenchmark(str);
			}
		}
	}
}

export default BenchmarkGroup;
