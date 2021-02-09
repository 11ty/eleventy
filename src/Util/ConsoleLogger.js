const chalk = require("chalk");
const debug = require("debug")("Eleventy:Logger");

class ConsoleLogger {
  constructor() {
    this._isVerbose = true;
  }

  get isVerbose() {
    return this._isVerbose;
  }

  set isVerbose(verbose) {
    this._isVerbose = !!verbose;
  }

  get isChalkEnabled() {
    if (this._isChalkEnabled !== undefined) {
      return this._isChalkEnabled;
    }
    return true;
  }

  set isChalkEnabled(enabled) {
    this._isChalkEnabled = !!enabled;
  }

  overrideLogger(logger) {
    this._logger = logger;
  }

  warn(msg) {
    this.message(msg, "warn", "yellow");
  }

  error(msg) {
    this.message(msg, "error", "red");
  }

  log(msg) {
    this.message(msg);
  }

  message(message, type = "log", chalkColor = false) {
    if (!this.isVerbose || process.env.DEBUG) {
      debug(message);
    } else if (this._logger !== false) {
      let logger = this._logger || console;
      if (chalkColor && this.isChalkEnabled) {
        logger[type](chalk[chalkColor](message));
      } else {
        logger[type](message);
      }
    }
  }
}

module.exports = ConsoleLogger;
