import EventEmitter from "./Util/AsyncEventEmitter.js";
import Debug from "debug";
const debug = Debug("Eleventy:EventBus");

/**
 * @module 11ty/eleventy/EventBus
 */

debug("Setting up global EventBus.");
/**
 * Provides a global event bus that modules deep down in the stack can
 * subscribe to from a global singleton for decoupled pub/sub.
 * @type * {module:11ty/eleventy/Util/AsyncEventEmitter~AsyncEventEmitter}
 */
let bus = new EventEmitter();
bus.setMaxListeners(100);

export default bus;
