import { EventEmitter } from "node:events";

/**
 * This class emits events asynchronously.
 *
 * Note that Eleventy has two separate event emitter instances it uses:
 * 1. a userland one (UserConfig.js)
 * 2. a global one for internals (EventBus.js)
 */
class AsyncEventEmitter extends EventEmitter {
	#handlerMode = "parallel";

	// TypeScript slop
	constructor(...args) {
		super(...args);
	}

	reset() {
		// `eleventy#` event type listeners are removed at the start of each build (singletons)
		for (let type of this.eventNames()) {
			if (typeof type === "string" && type.startsWith("eleventy#")) {
				this.removeAllListeners(type);
			}
		}

	}

	/**
	 * @param {string} type - The event name to emit.
	 * @param {...*} args - Additional arguments that get passed to listeners.
	 * @returns {Promise} - Promise resolves once all listeners were invoked
	 */
	/** @ts-expect-error */
	async emit(type, ...args) {
		let listeners = this.listeners(type);
		if (listeners.length === 0) {
			return [];
		}

		if (this.#handlerMode == "sequential") {
			const result = [];
			for (const listener of listeners) {
				const returnValue = await listener.apply(this, args);
				result.push(returnValue);
			}
			return result;
		} else {
			return Promise.all(
				listeners.map((listener) => {
					return listener.apply(this, args);
				}),
			);
		}
	}

	/**
	 * @param {string} type - The event name to emit.
	 * @param {...*} args - Additional lazy-executed function arguments that get passed to listeners.
	 * @returns {Promise} - Promise resolves once all listeners were invoked
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

	setHandlerMode(mode) {
		this.#handlerMode = mode;
	}
}

export default AsyncEventEmitter;
