import fs from "node:fs";

import { TemplatePath } from "@11ty/eleventy-utils";
import { normalizeFilePathInEleventyPackage } from "./Require.js";

// async version of this in Require.js

// Used for JSON imports, suffering from Node warning that import assertions experimental but also
// throwing an error if you try to import() a JSON file without an import assertion.
function loadContentsSync(path, options = {}) {
	let rawInput;
	let encoding = "utf8";
	if ("encoding" in options) {
		encoding = options.encoding;
	}

	try {
		rawInput = fs.readFileSync(path, encoding);
	} catch (e) {
		// if file does not exist, return nothing
	}

	// Can return a buffer, string, etc
	if (typeof rawInput === "string") {
		rawInput = rawInput.trim();
	}

	return rawInput;
}

function importJsonSync(filePath) {
	if (!filePath.endsWith(".json")) {
		throw new Error(`importJsonSync expects a .json file extension (received: ${filePath})`);
	}

	let rawInput = loadContentsSync(filePath);
	return JSON.parse(rawInput);
}

// TODO cache
function getEleventyPackageJson() {
	let filePath = normalizeFilePathInEleventyPackage("package.json");
	return importJsonSync(filePath);
}

// TODO cache
function getModulePackageJson(dir) {
	let filePath = TemplatePath.absolutePath(dir, "package.json");
	return importJsonSync(filePath);
}

// TODO cache
function getWorkingProjectPackageJson() {
	return getModulePackageJson(TemplatePath.getWorkingDir());
}

export {
	importJsonSync,
	getEleventyPackageJson,
	getModulePackageJson,
	getWorkingProjectPackageJson,
};
