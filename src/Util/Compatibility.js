import semver from "semver";

import { getEleventyPackageJson, getWorkingProjectPackageJson } from "./ImportJsonSync.js";

const pkg = getEleventyPackageJson();

// Used in user config versionCheck method.
class Compatibility {
	static NORMALIZE_PRERELEASE_REGEX = /-canary\b/g;

	static #projectPackageJson;

	constructor(compatibleRange) {
		this.compatibleRange = Compatibility.getCompatibilityValue(compatibleRange);
	}

	static get projectPackageJson() {
		if (!this.#projectPackageJson) {
			this.#projectPackageJson = getWorkingProjectPackageJson();
		}

		return this.#projectPackageJson;
	}

	static normalizeIdentifier(identifier) {
		return identifier.replace(Compatibility.NORMALIZE_PRERELEASE_REGEX, "-alpha");
	}

	static getCompatibilityValue(compatibleRange) {
		if (compatibleRange) {
			return compatibleRange;
		}

		// fetch from project’s package.json
		if (this.projectPackageJson?.["11ty"]?.compatibility) {
			return this.projectPackageJson["11ty"].compatibility;
		}
	}

	isCompatible() {
		return Compatibility.satisfies(pkg.version, this.compatibleRange);
	}

	static satisfies(version, compatibleRange) {
		return semver.satisfies(
			Compatibility.normalizeIdentifier(version),
			Compatibility.normalizeIdentifier(compatibleRange),
			{
				includePrerelease: true,
			},
		);
	}

	getErrorMessage() {
		return `We found Eleventy version '${pkg.version}' which does not meet the required version range: '${this.compatibleRange}'. Use \`npm install @11ty/eleventy\` to upgrade your local project to the latest Eleventy version (or \`npm install @11ty/eleventy -g\` to upgrade the globally installed version).`;
	}
}

export default Compatibility;
