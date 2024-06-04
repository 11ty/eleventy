import fs from "node:fs";
import { createRequire } from "node:module";
import debugUtil from "debug";

import { TemplatePath } from "@11ty/eleventy-utils";

import { normalizeFilePathInEleventyPackage } from "./Require.js";

const debug = debugUtil("Eleventy:ImportJsonSync");
const require = createRequire(import.meta.url);

function findFilePathInParentDirs(dir, filename) {
	// `package.json` searches look in parent dirs:
	// https://docs.npmjs.com/cli/v7/configuring-npm/folders#more-information
	// Fixes issue #3178, limited to working dir paths only
	let workingDir = TemplatePath.getWorkingDir();
	let allDirs = TemplatePath.getAllDirs(dir).filter((entry) => entry.startsWith(workingDir));

	for (let dir of allDirs) {
		let newPath = TemplatePath.join(dir, filename);
		if (fs.existsSync(newPath)) {
			debug("Found %o searching parent directories at: %o", filename, dir);
			return newPath;
		}
	}
}

function importJsonSync(filePath) {
	if (!filePath.endsWith(".json")) {
		throw new Error(`importJsonSync expects a .json file extension (received: ${filePath})`);
	}

	try {
		// TODO clear require.cache when these files change
		return require(filePath);
	} catch (e) {
		debug("Attempted to import %o, received this error: %o", filePath, e);
		// if file does not exist, return nothing
	}
}

function getEleventyPackageJson() {
	let filePath = normalizeFilePathInEleventyPackage("package.json");
	return importJsonSync(filePath);
}

function getModulePackageJson(dir) {
	let filePath = findFilePathInParentDirs(TemplatePath.absolutePath(dir), "package.json");
	return importJsonSync(filePath);
}

function getWorkingProjectPackageJson() {
	let dir = TemplatePath.absolutePath(TemplatePath.getWorkingDir());
	let filePath = findFilePathInParentDirs(dir, "package.json");
	return importJsonSync(filePath);
}

export {
	importJsonSync,
	findFilePathInParentDirs,
	getEleventyPackageJson,
	getModulePackageJson,
	getWorkingProjectPackageJson,
};
