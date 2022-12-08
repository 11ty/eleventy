const EventEmitter = require("events");

/**
 * This class emits events asynchronously.
 * It can be used for time measurements during a build.
 */
class AsyncEventEmitter extends EventEmitter {
  /**
   * @param {string} type - The event name to emit.
   * @param {*[]} args - Additional arguments that get passed to listeners.
   * @returns {Promise<*[]>} - Promise resolves once all listeners were invoked
   */
  async emit(type, ...args) {
    let listeners = this.listeners(type);
    if (listeners.length === 0) {
      return [];
    }

    return Promise.all(listeners.map((listener) => listener.apply(this, args)));
  }

  /**
   * @param {string} type - The event name to emit.
   * @param {*[]} args - Additional lazy-executed function arguments that get passed to listeners.
   * @returns {Promise<*[]>} - Promise resolves once all listeners were invoked
   */
  async emitLazy(type, ...args) {
    let listeners = this.listeners(type);
    if (listeners.length === 0) {
      return [];
    }

    let argsMap = [];
    for (let arg of args) {
      if (typeof arg === "function") {
        let r = arg();
        if (r instanceof Promise) {
          r = await r;
        }
        argsMap.push(r);
      } else {
        argsMap.push(arg);
      }
    }

    return this.emit.call(this, type, ...argsMap);
  }
}

module.exports = AsyncEventEmitter;
