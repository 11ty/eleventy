const chalk = require("chalk");
const debug = require("debug")("Eleventy:EleventyErrorHandler");

class EleventyErrorHandler {
  static warn(e, msg) {
    EleventyErrorHandler.initialMessage(msg, "warn", "yellow");
    EleventyErrorHandler.log(e, "warn");
  }

  static fatal(e, msg) {
    EleventyErrorHandler.error(e, msg);
    process.exitCode = 1;
  }

  static error(e, msg) {
    EleventyErrorHandler.initialMessage(msg, "error", "red");
    EleventyErrorHandler.log(e, "error");
  }

  static log(e, type = "log", prefix = ">") {
    let ref = e;
    while (ref) {
      let nextRef = ref.originalError;
      EleventyErrorHandler.message(
        (process.env.DEBUG ? "" : `${prefix} `) +
          `${ref.message} (${ref.name})${!nextRef ? ":" : ""}`,
        type
      );
      if (process.env.DEBUG) {
        debug(`(${type} stack): ${ref.stack}`);
      } else if (!nextRef) {
        // last error in the loop
        let prefix = "    ";
        EleventyErrorHandler.message(
          prefix + (ref.stack || "").split("\n").join("\n" + prefix)
        );
      }
      ref = nextRef;
    }
  }

  static initialMessage(message, type = "log", chalkColor = "blue") {
    if (message) {
      EleventyErrorHandler.message(
        message + ":" + (process.env.DEBUG ? "" : " (more in DEBUG output)"),
        type,
        chalkColor
      );
    }
  }

  static message(message, type = "log", chalkColor) {
    if (process.env.DEBUG) {
      debug(message);
    } else {
      let logger = EleventyErrorHandler.logger || console;
      if (chalkColor) {
        logger[type](chalk[chalkColor](message));
      } else {
        logger[type](message);
      }
    }
  }
}

module.exports = EleventyErrorHandler;
