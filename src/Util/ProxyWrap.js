import types from "node:util/types";
import debugUtil from "debug";
import { isPlainObject } from "@11ty/eleventy-utils";

const debug = debugUtil("Dev:Eleventy:Proxy");

function wrapObject(target, fallback, options) {
	let { benchmarkManager } = options || {};
	let bench;

	if (benchmarkManager) {
		bench = benchmarkManager.get("Aggregate");
	}

	return new Proxy(target, {
		getOwnPropertyDescriptor(target, prop) {
			// let b = bench?.get("Data cascade proxy wrap (getOwnPropertyDescriptor)")
			// b?.before();

			let ret;

			if (Reflect.has(target, prop)) {
				ret = Reflect.getOwnPropertyDescriptor(target, prop);
			} else if (Reflect.has(fallback, prop)) {
				ret = Reflect.getOwnPropertyDescriptor(fallback, prop);
			}

			// b?.after();
			return ret;
		},
		has(target, prop) {
			// debug( "handler:has", prop, Reflect.has(target, prop), Reflect.has(fallback, prop));
			if (Reflect.has(target, prop)) {
				return true;
			}

			return Reflect.has(fallback, prop);
		},
		ownKeys(target) {
			let s = new Set();
			for (let k of Reflect.ownKeys(target)) {
				s.add(k);
			}
			if (isPlainObject(fallback)) {
				for (let k of Reflect.ownKeys(fallback)) {
					s.add(k);
				}
			}
			return Array.from(s);
		},
		get(target, prop) {
			debug("handler:get", prop);

			// let benchGet = bench?.get("Data cascade proxy wrap (get)");
			// benchGet?.before();

			let value = Reflect.get(target, prop);

			if (Reflect.has(target, prop)) {
				// Already proxied
				if (types.isProxy(value)) {
					// benchGet?.after();
					return value;
				}

				if (isPlainObject(value) && Reflect.has(fallback, prop)) {
					let ret = wrapObject(value, Reflect.get(fallback, prop));
					debug("  handler:get (object)", prop, "found on primary ****", ret);
					// benchGet?.after();
					return ret;
				}

				debug("  handler:get (not object)", prop, "found on primary ****");
				// benchGet?.after();
				return value;
			}

			// Does not exist in primary
			if (Reflect.has(fallback, prop)) {
				// fallback has prop
				let fallbackValue = Reflect.get(fallback, prop);

				if (isPlainObject(fallbackValue)) {
					debug("  > proxying (fallback has prop)", { fallback, prop, fallbackValue });
					// set empty object on primary
					let emptyObject = {};
					Reflect.set(target, prop, emptyObject);

					let ret = wrapObject(emptyObject, fallbackValue);
					// benchGet?.after();
					return ret;
				}

				debug("  > returning (fallback has prop, not object)", { prop, fallbackValue });
				// benchGet?.after();
				return fallbackValue;
			}

			// primary *and* fallback do _not_ have prop
			debug("  > returning (primary and fallback missing prop)", { prop, value });

			// benchGet?.after();

			return value;
		},
		set(target, prop, value) {
			debug("handler:set", { target, prop, value });
			return Reflect.set(target, prop, value);
		},
	});
}

function ProxyWrap(target, fallback, options) {
	if (!isPlainObject(target) || !isPlainObject(fallback)) {
		throw new Error("ProxyWrap expects objects for both the target and fallback");
	}

	return wrapObject(target, fallback, options);
}

export { ProxyWrap };
