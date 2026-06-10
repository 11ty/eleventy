import lodash from "@11ty/lodash-custom";

const { set: lodashSet, get: lodashGet } = lodash;

// buildawesomeDataSchema looks for buildawesomeDataSchema and eleventyDataSchema (this is what we use internally)
// eleventyDataSchema looks for eleventyDataSchema (and not buildawesomeDataSchema)
export class ResolveConfigurationData {
	static ELIGIBLE_PROPS = new Set([
		"buildawesomeComputed",
		"buildawesomeDataSchema",
		"buildawesomeExcludeFromCollections",
		"buildawesomeImport",
	]);
	static BUILDAWESOME_PREFIX = "buildawesome";
	static ELEVENTY_PREFIX = "eleventy";

	// buildawesomeDataSchema becomes eleventyDataSchema
	// eleventyDataSchema returned undefined
	static getAlternatePropertyName(propertyName) {
		if (typeof propertyName === "string" && this.ELIGIBLE_PROPS.has(propertyName)) {
			let prefixRemoved = propertyName.slice(ResolveConfigurationData.BUILDAWESOME_PREFIX.length);
			return this.ELEVENTY_PREFIX + prefixRemoved;
		}
	}

	static getEligibleLocations(original) {
		let eligibleLocations = [original];
		let alternate = this.getAlternatePropertyName(original);
		if (alternate !== undefined && alternate !== original) {
			eligibleLocations.push(alternate);
		}
		return eligibleLocations;
	}

	static resolve(data, location) {
		let eligible = this.getEligibleLocations(location);
		for (let loc of eligible) {
			let val = lodashGet(data, loc, undefined);
			if (val !== undefined) {
				return {
					location: loc,
					value: val,
				};
			}
		}

		return {
			location: undefined,
		};
	}

	static getValue(data, location) {
		let eligible = this.getEligibleLocations(location);

		for (let loc of eligible) {
			let val = lodashGet(data, loc, undefined);
			if (val !== undefined) {
				return val;
			}
		}
	}
}
