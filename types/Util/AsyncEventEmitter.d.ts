export default AsyncEventEmitter;
/**
 * This class emits events asynchronously.
 * It can be used for time measurements during a build.
 */
declare class AsyncEventEmitter extends EventEmitter<[never]> {
    constructor(...args: any[]);
    /**
     * @param {string} type - The event name to emit.
     * @param {...*} args - Additional arguments that get passed to listeners.
     * @returns {Promise} - Promise resolves once all listeners were invoked
     */
    /** @ts-expect-error */
    emit(type: any, ...args: any[]): Promise<any[]>;
    /**
     * @param {string} type - The event name to emit.
     * @param {...*} args - Additional lazy-executed function arguments that get passed to listeners.
     * @returns {Promise} - Promise resolves once all listeners were invoked
     */
    emitLazy(type: string, ...args: any[]): Promise<any>;
}
import { EventEmitter } from "node:events";
