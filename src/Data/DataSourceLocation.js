import { isPlainObject } from "@11ty/eleventy-utils";

export class ArgumentHelper {
	static isComplexArgument(v) {
		return !this.isPrimitive(v) && !this.hasLocation(v);
	}
	static isPrimitive(v) {
		return v !== Object(v);
	}
	static hasLocation(obj) {
		return ["StringLocation", "NumberLocation"].includes(obj?.constructor?.name);
	}

	static getFriendlyType(obj) {
		if (this.hasLocation(obj)) {
			let original = obj.getOriginalValue();
			if (this.hasLocation(original)) {
				throw new Error("Internal error: data source location mapped to self (circular reference)");
			}
			return this.getFriendlyType(original);
		}
		if (Array.isArray(obj)) {
			return "array";
		}
		if (isPlainObject(obj)) {
			return "object";
		}
		return typeof obj;
	}

	static hasArgumentParity(args = []) {
		let types = {};
		for (let a of args) {
			let type = this.getFriendlyType(a);
			if (!types[type]) {
				types[type] = 0;
			}
			types[type]++;
		}
		let keys = Object.keys(types);
		return keys.length === 1;
	}

	// TODO add configuration option to hard-code the execution mode for a filter
	static getExecutionMode(...args) {
		// skips if args.length is 1
		if (!this.hasArgumentParity(args)) {
			return "partial";
		}

		// some args are not primitives and aren’t location-aware
		let complexArgs = args.filter((a) => this.isComplexArgument(a));
		if (complexArgs.length > 0) {
			return "execute";
		}

		// is empty or single literal
		return "passthrough";
	}

	static mapToLocation(args) {
		return args.filter((a) => this.hasLocation(a)).map((a) => a.getLocation());
	}

	static wrapFilter(callback) {
		return function (...args) {
			if (this.__useInternalDataMapSource) {
				let mode = ArgumentHelper.getExecutionMode(...args);
				if (mode === "passthrough") {
					return ArgumentHelper.mapToLocation(args);
				}

				if (mode === "partial") {
					args = args.map((entry, index) => {
						if (index > 0 && ArgumentHelper.hasLocation(entry)) {
							return entry.getOriginalValue();
						}
						return entry;
					});
				}
			}

			// @ts-ignore
			return callback.call(this, ...args);
		};
	}
}

function stringifyLocation(target) {
	return `{via::${target.filePath}::${target.selectorLocation}::${("" + target).length}}`;
}
export function stringifyReadonlyLocation(label) {
	return `{via::11ty_readonly${label ? `::${label}` : ""}}`;
}

class StringLocation extends String {
	constructor(val, filePath, selectorLocation) {
		super(val);
		this.original = val;
		this.val = "" + val;
		this.filePath = filePath;
		this.selectorLocation = selectorLocation;
	}

	getLocation() {
		return stringifyLocation(this);
	}

	getOriginalValue() {
		return this.original;
	}

	toString() {
		return this.getLocation();
	}

	[Symbol.toPrimitive](hint) {
		return this.val;
	}
}

class NumberLocation extends Number {
	constructor(val, filePath, selectorLocation) {
		super(val);
		this.original = val;
		this.val = Number(val);
		this.filePath = filePath;
		this.selectorLocation = selectorLocation;
	}

	getLocation() {
		return stringifyLocation(this);
	}

	getOriginalValue() {
		return this.original;
	}

	toString() {
		return this.getLocation();
	}

	[Symbol.toPrimitive](hint) {
		return this.val;
	}
}

export function LocationFactory(val, ...args) {
	if (typeof val === "number") {
		return new NumberLocation(val, ...args);
	}
	if (typeof val === "string") {
		return new StringLocation(val, ...args);
	}
	// Not supported yet (there is no userland way to intercept boolean coercion, e.g. `new BooleanLocation()` would always return true)
	// if(typeof val === "boolean") {
	// 	return val;
	// }
}
