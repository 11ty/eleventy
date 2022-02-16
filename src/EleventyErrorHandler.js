const ConsoleLogger = require("./Util/ConsoleLogger");
const EleventyErrorUtil = require("./EleventyErrorUtil");
const debug = require("debug")("Eleventy:EleventyErrorHandler");

class EleventyErrorHandler {
  constructor() {
    this._isVerbose = true;
  }

  get isVerbose() {
    return this._isVerbose;
  }

  set isVerbose(verbose) {
    this._isVerbose = !!verbose;
    this.logger.isVerbose = !!verbose;
  }

  get logger() {
    if (!this._logger) {
      this._logger = new ConsoleLogger();
      this._logger.isVerbose = this.isVerbose;
    }

    return this._logger;
  }

  set logger(logger) {
    this._logger = logger;
  }

  warn(e, msg) {
    if (msg) {
      this.initialMessage(msg, "warn", "yellow");
    }
    this.log(e, "warn");
  }

  fatal(e, msg) {
    this.error(e, msg);
    process.exitCode = 1;
  }

  error(e, msg) {
    if (msg) {
      this.initialMessage(msg, "error", "red", true);
    }
    this.log(e, "error", undefined, true);
  }

  //https://nodejs.org/api/process.html
  log(e, type = "log", chalkColor = "", forceToConsole = false) {
    let errorCount = 0;
    let errorCountRef = e;
    while (errorCountRef) {
      errorCount++;
      errorCountRef = errorCountRef.originalError;
    }

    let ref = e;
    let index = 1;
    while (ref) {
      let nextRef = ref.originalError;
      if (!nextRef && EleventyErrorUtil.hasEmbeddedError(ref.message)) {
        nextRef = EleventyErrorUtil.deconvertErrorToObject(ref);
      }

      this.logger.message(
        `${errorCount > 1 ? `${index}. ` : ""}${(
          EleventyErrorUtil.cleanMessage(ref.message) ||
          "(No error message provided)"
        ).trim()} (via ${ref.name})`,
        type,
        chalkColor,
        forceToConsole
      );

      if (process.env.DEBUG) {
        debug(`(${type} stack): ${ref.stack}`);
      } else if (!nextRef) {
        // last error in the loop
        let prefix = "    ";

        // remove duplicate error messages if the stack contains the original message output above
        let stackStr = ref.stack || "";
        if (e.removeDuplicateErrorStringFromOutput) {
          stackStr = stackStr.replace(
            `${ref.name}: ${ref.message}`,
            "(Repeated output has been truncated…)"
          );
        }
        this.logger.message(
          "\nOriginal error stack trace: " + stackStr,
          type,
          chalkColor,
          forceToConsole
        );
      }
      ref = nextRef;
      index++;
    }
  }

  initialMessage(
    message,
    type = "log",
    chalkColor = "blue",
    forceToConsole = false
  ) {
    if (message) {
      this.logger.message(
        message + ":" + (process.env.DEBUG ? "" : " (more in DEBUG output)"),
        type,
        chalkColor,
        forceToConsole
      );
    }
  }
}

module.exports = EleventyErrorHandler;
