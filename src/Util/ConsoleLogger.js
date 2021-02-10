const chalk = require("chalk");
const debug = require("debug")("Eleventy:Logger");
const Readable = require("stream").Readable;
const split = require("split");

class ConsoleLogger {
  constructor() {
    this._isVerbose = true;
    this.isViaCommandLine = false;
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

  warn(msg) {
    this.message(msg, "warn", "yellow");
  }

  error(msg) {
    this.message(msg, "error", "red");
  }

  log(msg) {
    this.message(msg);
  }

  toStream(msg, suffix = "") {
    // only output to stdout/console if we’re running in command line
    if (this.isViaCommandLine) {
      console.log(msg);
    } else {
      this.outputStream.push(msg + suffix);
    }
  }

  closeStream(to = "") {
    this.outputStream.push(null);

    if (to === "ndjson") {
      return this.outputStream.pipe(
        split(JSON.parse, null, { trailing: false })
      );
    }
    return this.outputStream;
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
