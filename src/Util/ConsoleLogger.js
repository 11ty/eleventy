const chalk = require("chalk");
const debug = require("debug")("Eleventy:Logger");
const Readable = require("stream").Readable;
const split = require("split");
/** @typedef {import('stream').Readble Readable} */

/**
 * Logger implementation that logs to STDOUT.
 */
class ConsoleLogger {
  constructor() {
    /** @private */
    this._isVerbose = true;
    /** @type {Readable} */
    this.outputStream = Readable();
  }

  get isVerbose() {
    return this._isVerbose;
  }

  set isVerbose(verbose) {
    this._isVerbose = !!verbose;
  }

  /** @returns {boolean} */
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

  /** @param {string} msg */
  log(msg) {
    this.message(msg);
  }

  /** @param {string} msg */
  forceLog(msg) {
    this.message(msg, undefined, undefined, true);
  }

  /** @param {string} msg */
  warn(msg) {
    this.message(msg, "warn", "yellow");
  }

  // Is this used?
  /** @param {string} msg */
  error(msg) {
    this.message(msg, "error", "red");
  }

  /** @param {string} msg */
  toStream(msg) {
    this.outputStream.push(msg);
  }

  closeStream(to = "") {
    this.outputStream.push(null);

    if (to === "ndjson") {
      return this.outputStream.pipe(
        // split(JSON.parse, null, { trailing: false })
        split(null, null, { trailing: false })
      );
    }
    return this.outputStream;
  }

  /**
   * Formats the message to log.
   *
   * @param {string} message - The raw message to log.
   * @param {'log'|'warn'|'error'} [type='log'] - The error level to log.
   * @param {boolean} [chalkColor=false] - Use coloured log output?
   * @param {boolean} [forceToConsole=false] - Enforce a log on console instead of specified target.
   */
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
