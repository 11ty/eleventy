const EleventyBaseError = require("../EleventyBaseError");

class JavaScriptInvalidDataFormatError extends EleventyBaseError {}

module.exports = async function (inst, inputPath, key = "data", mixins = {}) {
  if (inst && key in inst) {
    // get extra data from `data` method,
    // either as a function or getter or object literal
    let result = await (typeof inst[key] === "function"
      ? Object.keys(mixins).length > 0
        ? inst[key].call(mixins)
        : inst[key]()
      : inst[key]);
    if (typeof result !== "object") {
      throw new JavaScriptInvalidDataFormatError(
        `Invalid data format returned from ${inputPath}: typeof ${typeof result}`
      );
    }
    return result;
  }
};
