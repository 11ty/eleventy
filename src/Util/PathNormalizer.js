import path from "node:path";
import { fileURLToPath } from "node:url";
import { TemplatePath } from "@11ty/eleventy-utils";

export default class PathNormalizer {
	static getParts(inputPath) {
		if (!inputPath) {
			return [];
		}

		let separator = "/";
		if (inputPath.includes(path.sep)) {
			separator = path.sep;
		}

		return inputPath.split(separator).filter((entry) => entry !== ".");
	}

	// order is important here: the top-most directory returns first
	// array of file and all parent directories
	static getAllPaths(inputPath) {
		let parts = this.getParts(inputPath);
		let allPaths = [];

		let fullpath = "";
		for (let part of parts) {
			fullpath += (fullpath.length > 0 ? "/" : "") + part;
			allPaths.push(fullpath);
		}

		return allPaths;
	}

	static normalizeSeperator(inputPath) {
		if (!inputPath) {
			return inputPath;
		}
		return inputPath.split(path.sep).join("/");
	}

	static fullNormalization(inputPath) {
		if (typeof inputPath !== "string") {
			return inputPath;
		}

		// Fix file:///Users/ or file:///C:/ paths passed in
		if (inputPath.startsWith("file://")) {
			inputPath = fileURLToPath(inputPath);
		}

		// Paths should not be absolute (we convert absolute paths to relative)
		// Paths should not have a leading dot slash
		// Paths should always be `/` independent of OS path separator
		return TemplatePath.stripLeadingDotSlash(
			this.normalizeSeperator(TemplatePath.relativePath(inputPath)),
		);
	}
}
