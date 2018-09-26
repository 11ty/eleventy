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
      EleventyErrorHandler.message(
        (process.env.DEBUG ? "" : `${prefix} `) +
          `${ref.message} (${ref.name})`,
        type
      );
      debug(`(${type} stack): ${ref.stack}`);
      ref = ref.originalError;
    }
  }

  static initialMessage(message, type = "log", chalkColor = "blue") {
    if (message) {
      EleventyErrorHandler.message(
        message +
          ":" +
          (process.env.DEBUG ? "" : " (full stack in DEBUG output)"),
        type,
        chalkColor
      );
    }
  }

  static message(message, type = "log", chalkColor) {
    if (process.env.DEBUG) {
      debug(message);
    } else {
      if (chalkColor) {
        console[type](chalk[chalkColor](message));
      } else {
        console[type](message);
      }
    }
  }
}

module.exports = EleventyErrorHandler;
