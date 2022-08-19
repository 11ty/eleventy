import { join, sep } from "node:path";

export default class PathPrefixer {
  static normalizePathPrefix(pathPrefix) {
    if (pathPrefix) {
      // add leading / (for browsersync), see #1454
      // path.join uses \\ for Windows so we split and rejoin
      return PathPrefixer.joinUrlParts("/", pathPrefix);
    }

    return "/";
  }

  static joinUrlParts(...parts) {
    return join(...parts)
      .split(sep)
      .join("/");
  }
}
