export default bus;
/**
 * Provides a global event bus that modules deep down in the stack can
 * subscribe to from a global singleton for decoupled pub/sub.
 * @type {module:11ty/eleventy/Util/AsyncEventEmitter~AsyncEventEmitter}
 */
declare let bus: any;
