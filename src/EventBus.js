const EventEmitter = require("./Util/AsyncEventEmitter");
const debug = require("debug")("Eleventy:EventBus");

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

module.exports = bus;
