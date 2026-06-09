import lodash from "@11ty/lodash-custom";

const { set: lodashSet, get: lodashGet } = lodash;

export class ResolveConfigurationData {
	static BUILDAWESOME_PREFIX = "buildawesome.";
	static ELEVENTY_PREFIX = "eleventy";

	static capitalize(propName) {
		return propName.slice(0, 1).toUpperCase() + propName.slice(1);
	}

	// buildawesome.dataSchema becomes eleventyDataSchema
	static getAlternatePropertyName(propertyName) {
		if (
			typeof propertyName === "string" &&
			propertyName.startsWith(ResolveConfigurationData.BUILDAWESOME_PREFIX)
		) {
			let prefixRemoved = propertyName.slice(ResolveConfigurationData.BUILDAWESOME_PREFIX.length);
			return this.ELEVENTY_PREFIX + this.capitalize(prefixRemoved);
		}
	}

	static getValue(data, location) {
		let eligibleLocations = [location];
		let alternate = ResolveConfigurationData.getAlternatePropertyName(location);
		if (alternate !== undefined) {
			eligibleLocations.push(alternate);
		}

		for (let loc of eligibleLocations) {
			let val = lodashGet(data, loc, undefined);
			if (val !== undefined) {
				return val;
			}
		}
	}
}
