const EventEmitter = require("events");
const lodashGet = require("lodash/get");
const lodashIsEmpty = require("lodash/isEmpty");

class AsyncEventEmitter extends EventEmitter {
  async emit(type, ...args) {
    const handler = lodashGet(this._events, type);
    if (lodashIsEmpty(handler) && typeof handler !== "function") {
      return;
    }

    if (typeof handler === "function") {
      await handler.apply(this, args);
    } else {
      await Promise.all(handler.map((h) => h.apply(this, args)));
    }

    return true;
  }
}

module.exports = AsyncEventEmitter;
