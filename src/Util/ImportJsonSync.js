import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import debugUtil from "debug";

import { TemplatePath } from "@11ty/eleventy-utils";

import { normalizeFilePathInEleventyPackage } from "./Require.js";

const debug = debugUtil("Eleventy:ImportJsonSync");
const require = createRequire(import.meta.url);

function importJsonSync(filePath, lookInParentDirs = false) {
	if (!filePath.endsWith(".json")) {
		throw new Error(`importJsonSync expects a .json file extension (received: ${filePath})`);
	}

	try {
		// `package.json` searches look in parent dirs:
		// https://docs.npmjs.com/cli/v7/configuring-npm/folders#more-information
		if (lookInParentDirs) {
			let filename = path.parse(filePath).base;
			let allDirs = TemplatePath.getAllDirs(filePath).slice(1);
			for (let dir of allDirs) {
				let newPath = TemplatePath.join(dir, filename);
				if (fs.existsSync(newPath)) {
					filePath = newPath;
					debug("Found %o searching parent directories at: %o", filename, filePath);
					break;
				}
			}
		}

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
	let filePath = TemplatePath.absolutePath(dir, "package.json");
	return importJsonSync(filePath);
}

function getWorkingProjectPackageJson() {
	let filePath = TemplatePath.absolutePath(TemplatePath.getWorkingDir(), "package.json");
	return importJsonSync(filePath, true);
}

export {
	importJsonSync,
	getEleventyPackageJson,
	getModulePackageJson,
	getWorkingProjectPackageJson,
};
