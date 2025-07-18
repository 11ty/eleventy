import { existsSync } from "node:fs";
import debugUtil from "debug";
import { TemplatePath } from "@11ty/eleventy-utils";

import { importJsonSync, eleventyPackageJson } from "./RequireUtils.js";

const debug = debugUtil("Eleventy:ImportJsonSync");

function findFilePathInParentDirs(dir, filename) {
	// `package.json` searches look in parent dirs:
	// https://docs.npmjs.com/cli/v7/configuring-npm/folders#more-information
	// Fixes issue #3178, limited to working dir paths only
	let workingDir = TemplatePath.getWorkingDir();
	// TODO use DirContains
	let allDirs = TemplatePath.getAllDirs(dir).filter((entry) => entry.startsWith(workingDir));

	for (let dir of allDirs) {
		let newPath = TemplatePath.join(dir, filename);
		if (existsSync(newPath)) {
			debug("Found %o searching parent directories at: %o", filename, dir);
			return newPath;
		}
	}
}

function getEleventyPackageJson() {
	return eleventyPackageJson;
}

// Used by EleventyServe.js for custom servers only
function getModulePackageJson(dir) {
	let filePath = findFilePathInParentDirs(TemplatePath.absolutePath(dir), "package.json");

	// Fails nicely
	if (!filePath) {
		return {};
	}

	return importJsonSync(filePath);
}

// This will *not* find a package.json in a parent directory above root
function getWorkingProjectPackageJsonPath() {
	let dir = TemplatePath.absolutePath(TemplatePath.getWorkingDir());
	return findFilePathInParentDirs(dir, "package.json");
}

function getWorkingProjectPackageJson() {
	let filePath = getWorkingProjectPackageJsonPath();

	// Fails nicely
	if (!filePath) {
		return {};
	}

	return importJsonSync(filePath);
}

export {
	importJsonSync,
	getEleventyPackageJson,
	getModulePackageJson,
	getWorkingProjectPackageJson,
	findFilePathInParentDirs,
	getWorkingProjectPackageJsonPath,
};
