import fs from "node:fs";
import debugUtil from "debug";
import { TemplatePath } from "@11ty/eleventy-utils";

import { importJsonSync } from "../Adapters/Util/require.js";

const debug = debugUtil("Eleventy:ImportJsonSync");

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

function getEleventyPackageJson() {
	// awkward but this needs to be relative to /Adapters/Util/require.js
	return importJsonSync("../../../package.json");
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

function getWorkingProjectPackageJson() {
	let dir = TemplatePath.absolutePath(TemplatePath.getWorkingDir());
	let filePath = findFilePathInParentDirs(dir, "package.json");

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

	// Testing
	findFilePathInParentDirs,
};
