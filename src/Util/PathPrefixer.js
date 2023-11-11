import path from "node:path";

import PathNormalizer from "./PathNormalizer.js";

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

export default PathPrefixer;
