export default BenchmarkManager;
declare class BenchmarkManager {
    benchmarkGroups: {};
    isVerbose: boolean;
    start: number;
    reset(): void;
    getNewTimestamp(): number;
    setVerboseOutput(isVerbose: any): void;
    hasBenchmarkGroup(name: any): boolean;
    getBenchmarkGroup(name: any): any;
    getAll(): {};
    get(name: any): any;
    finish(): void;
}
