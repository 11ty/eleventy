export default BenchmarkGroup;
declare class BenchmarkGroup {
    benchmarks: {};
    isVerbose: boolean;
    logger: ConsoleLogger;
    minimumThresholdMs: number;
    minimumThresholdPercent: number;
    setIsVerbose(isVerbose: any): void;
    reset(): void;
    add(type: any, callback: any): {
        (this: any, ...args: any[]): any;
        readonly __eleventyInternal: {
            type: string;
            callback: any;
        };
    };
    setMinimumThresholdMs(minimumThresholdMs: any): void;
    setMinimumThresholdPercent(minimumThresholdPercent: any): void;
    has(type: any): boolean;
    get(type: any): any;
    padNumber(num: any, length: any): any;
    finish(label: any, totalTimeSpent: any): void;
}
import ConsoleLogger from "../Util/ConsoleLogger.js";
