const path = require("path");

class PathNormalizer {
  static normalizeSeperator(inputPath) {
    if (!inputPath) {
      return inputPath;
    }
    return inputPath.split(path.sep).join("/");
  }
}

module.exports = PathNormalizer;
