const chalk = require("chalk");
const debug = require("debug")("Eleventy:EleventyErrorHandler");

class EleventyErrorHandler {
  static warn(e, msg) {
    EleventyErrorHandler.message(msg, "warn", "yellow");
    EleventyErrorHandler.log(e, "warn");
  }

  static fatal(e, msg) {
    EleventyErrorHandler.error(e, msg);
    process.exitCode = 1;
  }

  static error(e, msg) {
    EleventyErrorHandler.message(msg, "error", "red");
    EleventyErrorHandler.log(e, "error");
  }

  static message(message, type = "log", chalkColor = "blue") {
    if (message) {
      console[type](
        chalk[chalkColor](message + ": (full stack in DEBUG output)")
      );
    }
  }

  static log(e, type = "log", prefix = ">") {
    let ref = e;
    while (ref) {
      console[type](`${prefix} ${ref.message} (${ref.name})`);
      debug(`(${type}): %O`, ref.stack);
      ref = ref.originalError;
    }
  }
}

module.exports = EleventyErrorHandler;
