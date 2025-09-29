import { isPlainObject, DeepCopy } from "@11ty/eleventy-utils";
import lodash from "@11ty/lodash-custom";

import { LocationFactory, stringifyReadonlyLocation } from "./DataSourceLocation.js";

const { set: lodashSet, get: lodashGet } = lodash;

export class DataCascadeManager {
	static FLAGS = {
		DATA_LOCATION: "INTERNAL_DATA_LOCATION_MAPPING",
	};

	#factoryEnabled = false;

	constructor() {
		this.dataCascades = new Map();
	}

	setEnabled(isEnabled) {
		this.#factoryEnabled = Boolean(isEnabled);
	}

	has(templatePath) {
		return this.dataCascades.has(templatePath);
	}

	factory() {
		if (!this.#factoryEnabled) {
			return;
		}
		return new DataCascade();
	}

	create(templatePath) {
		let cascade = this.factory();
		if (!cascade) {
			return;
		}

		this.dataCascades.set(templatePath, cascade);
		return cascade;
	}

	get(templatePath) {
		if (!this.#factoryEnabled) {
			return;
		}

		if (!this.has(templatePath)) {
			throw new Error("Internal error: missing data cascade for " + templatePath);
		}

		return this.dataCascades.get(templatePath);
	}

	reset() {
		this.dataCascades = new Map();
	}
}

export class DataCascade {
	static READ_ONLY_KEY = "11ty:readonly";
	static TOGGLE_PROP_NAME = "__useInternalDataMapSource";

	constructor() {
		this.dataSourceLocations = {};

		Object.defineProperty(this.dataSourceLocations, DataCascade.TOGGLE_PROP_NAME, {
			value: true,
		});
	}

	// TODO start here, circular references are maximum call stacking
	static deepThaw(target) {
		if (Array.isArray(target)) {
			return target.map((entry) => this.deepThaw(entry));
		}

		if (isPlainObject(target)) {
			if (Object.isFrozen(target)) {
				let thawed = {};
				for (let key in target) {
					thawed[key] = this.deepThaw(target[key]);
				}
				return thawed;
			}

			// reuse existing
			for (let key in target) {
				target[key] = this.deepThaw(target[key]);
			}
		}
		return target;
	}

	// Global Data and Template Data Cascade combine
	mergeWithUpstreamDataCascade(...upstreamDataCascades) {
		let locations = upstreamDataCascades.map((entry) => entry.getLocations());
		this.dataSourceLocations = DeepCopy({}, ...locations, this.dataSourceLocations);
	}

	assignFromUpstreamDataCascade(...upstreamDataCascades) {
		let locations = upstreamDataCascades.map((entry) => entry.getLocations());
		this.dataSourceLocations = Object.assign({}, ...locations, this.dataSourceLocations);
	}

	mergeTopLevel(data, sourceFilePath) {
		let newSources = DataCascade.getMappingObject(
			data,
			sourceFilePath || DataCascade.READ_ONLY_KEY,
		);
		DeepCopy(this.dataSourceLocations, newSources);
	}

	mergeToLocation(data, location, sourceFilePath, dataSourceSelector) {
		let target = lodashGet(this.dataSourceLocations, location);
		let source = DataCascade.getMappingObject(
			data,
			sourceFilePath || DataCascade.READ_ONLY_KEY,
			dataSourceSelector,
		);

		let merged = DeepCopy(target, source);
		lodashSet(this.dataSourceLocations, location, merged);
	}

	// For computed data
	markLocationAsReadOnly(location) {
		lodashSet(this.dataSourceLocations, location, stringifyReadonlyLocation(location));
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

	static getMappingObject(target, sourceFilePath, dataLocationSelector = "") {
		if (typeof target === "function") {
			return target;
		} else if (sourceFilePath.startsWith("11ty:")) {
			// readonly/internal mappings
			// internal data may be frozen (think `eleventy` global)
			return DataCascade.deepThaw(target);
		}

		if (sourceFilePath.startsWith("./")) {
			sourceFilePath = sourceFilePath.slice(2);
		}

		if (typeof target === "string" || typeof target === "number") {
			return LocationFactory(target, sourceFilePath, dataLocationSelector);
		}

		if (Array.isArray(target)) {
			return target.map((entry, index) =>
				this.getMappingObject(entry, sourceFilePath, `${dataLocationSelector}[${index}]`),
			);
		}

		if (isPlainObject(target)) {
			if (Object.isFrozen(target)) {
				return DataCascade.deepThaw(target);
			}

			let obj = {};
			for (let propName in target) {
				obj[propName] = this.getMappingObject(
					target[propName],
					sourceFilePath,
					this.#getPropertySelector(dataLocationSelector, propName),
				);
			}
			return obj;
		}

		return target;
	}
}
