import { isPlainObject, Merge } from "@11ty/eleventy-utils";
import lodash from "@11ty/lodash-custom";

const { set: lodashSet, get: lodashGet } = lodash;

export class DataCascade {
	static READ_ONLY_KEY = "11ty:readonly";
	static UNEDITABLE_TYPE_KEY = "11ty:invalid_type";
	static INTERNAL_KEY = "11ty:internal";

	static PREFIX = "[[via::";
	static POSTFIX = "]]";

	constructor() {
		this.dataSourceLocations = {
			collections: [],
			// __useInternalDataMapSource: true, // toggle on no-op behavior for filters
		};
	}

	#getMergedSource(target, source) {
		if (isPlainObject(target)) {
			if (isPlainObject(source)) {
				return Merge(target, source);
			}
			return target;
		}
		if (Array.isArray(target)) {
			if (Array.isArray(source)) {
				return [...target, ...source];
			}
			return target;
		}
		return source;
	}

	// Global Data and Template Data Cascade combine
	mergeWithUpstreamDataCascade(...upstreamDataCascades) {
		let locations = upstreamDataCascades.map((entry) => entry.getLocations());
		this.dataSourceLocations = Merge({}, ...locations, this.dataSourceLocations);
	}

	mergeTopLevel(data, dataSourceLocation) {
		let newSources = DataCascade.getMappingObject(
			data,
			dataSourceLocation || DataCascade.READ_ONLY_KEY,
		);
		Merge(this.dataSourceLocations, newSources);
	}

	mergeToLocation(data, location, dataSourceLocation) {
		let target = lodashGet(this.dataSourceLocations, location);
		let source = DataCascade.getMappingObject(
			data,
			dataSourceLocation || DataCascade.READ_ONLY_KEY,
		);
		lodashSet(this.dataSourceLocations, location, this.#getMergedSource(target, source));
	}

	getLocations() {
		return this.dataSourceLocations;
	}

	static #getPropertySelector(selector, propName) {
		if (selector) {
			if (propName.includes("-") || propName.includes("'") || propName.includes('"')) {
				return `${selector}[${propName}]`;
			}
			return `${selector}.${propName}`;
		}

		// lodash.get selector locations work fine with top level prop names with - characters
		return propName;
	}

	static getMappingObject(target, sourceLocation, selector = "") {
		if (Array.isArray(target)) {
			return target.map((entry, index) =>
				this.getMappingObject(entry, sourceLocation, `${selector}[${index}]`),
			);
		}

		if (isPlainObject(target)) {
			let obj = {};
			for (let propName in target) {
				obj[propName] = this.getMappingObject(
					target[propName],
					sourceLocation,
					this.#getPropertySelector(selector, propName),
				);
			}
			return obj;
		}

		if (typeof target === "function") {
			return this.UNEDITABLE_TYPE_KEY;
		}

		if (sourceLocation.startsWith("11ty:")) {
			return this.PREFIX + sourceLocation + this.POSTFIX;
		}
		return this.PREFIX + sourceLocation + "::" + selector + this.POSTFIX;
	}
}
