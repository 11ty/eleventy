import types from "node:util/types";
import debugUtil from "debug";
import { isPlainObject } from "@11ty/eleventy-utils";

const debug = debugUtil("Dev:Eleventy:Proxy");

function wrapObject(target, fallback) {
	return new Proxy(target, {
		getOwnPropertyDescriptor(target, prop) {
			let ret;

			if (Reflect.has(target, prop)) {
				ret = Reflect.getOwnPropertyDescriptor(target, prop);
			} else if (Reflect.has(fallback, prop)) {
				ret = Reflect.getOwnPropertyDescriptor(fallback, prop);
			}

			return ret;
		},
		has(target, prop) {
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

			let value = Reflect.get(target, prop);

			if (Reflect.has(target, prop)) {
				// Already proxied
				if (types.isProxy(value)) {
					return value;
				}

				if (isPlainObject(value) && Reflect.has(fallback, prop)) {
					let ret = wrapObject(value, Reflect.get(fallback, prop));
					debug("handler:get (primary, object)", prop);
					return ret;
				}

				debug("handler:get (primary)", prop);
				return value;
			}

			// Does not exist in primary
			if (Reflect.has(fallback, prop)) {
				// fallback has prop
				let fallbackValue = Reflect.get(fallback, prop);

				if (isPlainObject(fallbackValue)) {
					debug("handler:get (fallback, object)", prop);
					// set empty object on primary
					let emptyObject = {};
					Reflect.set(target, prop, emptyObject);

					return wrapObject(emptyObject, fallbackValue);
				}

				debug("handler:get (fallback)", prop);
				return fallbackValue;
			}

			// primary *and* fallback do _not_ have prop
			debug("handler:get (not on primary or fallback)", prop);

			return value;
		},
		set(target, prop, value) {
			debug("handler:set", prop);

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
