export default Benchmark;
declare class Benchmark {
    timeSpent: number;
    timesCalled: number;
    beforeTimers: any[];
    reset(): void;
    getNewTimestamp(): number;
    incrementCount(): void;
    before(): void;
    after(): void;
    getTimesCalled(): number;
    getTotal(): number;
}
