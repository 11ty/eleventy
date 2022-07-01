const path = require("path");
const PathNormalizer = require("./PathNormalizer.js");

class PathPrefixer {
  static normalizePathPrefix(pathPrefix) {
    if (pathPrefix) {
      // add leading / (for browsersync), see #1454
      // path.join uses \\ for Windows so we split and rejoin
      return PathPrefixer.joinUrlParts("/", pathPrefix);
    }

    return "/";
  }

  static joinUrlParts(...parts) {
    return PathNormalizer.normalizeSeperator(path.join(...parts));
  }
}

module.exports = PathPrefixer;
