const path = require("path");

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
    return path
      .join(...parts)
      .split(path.sep)
      .join("/");
  }
}

module.exports = PathPrefixer;
