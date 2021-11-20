const chalk = require("kleur");
const debug = require("debug")("Eleventy:Logger");
const Readable = require("stream").Readable;

class ConsoleLogger {
  constructor() {
    this._isVerbose = true;
    this.outputStream = Readable();
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

  log(msg) {
    this.message(msg);
  }

  forceLog(msg) {
    this.message(msg, undefined, undefined, true);
  }

  warn(msg) {
    this.message(msg, "warn", "yellow");
  }

  // Is this used?
  error(msg) {
    this.message(msg, "error", "red");
  }

  toStream(msg) {
    this.outputStream.push(msg);
  }

  closeStream(to = "") {
    this.outputStream.push(null);
    return this.outputStream;
  }

  message(message, type = "log", chalkColor = false, forceToConsole = false) {
    if (!forceToConsole && (!this.isVerbose || process.env.DEBUG)) {
      debug(message);
    } else if (this._logger !== false) {
      message = `[11ty] ${message}`;

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
