import debugUtil from "debug";
import { isPlainObject } from "@11ty/eleventy-utils";

const debug = debugUtil("Dev:Eleventy:Proxy");

function wrapObject(target, fallback) {
	return new Proxy(target, {
		getOwnPropertyDescriptor(target, prop) {
			if (Reflect.has(target, prop)) {
				return Reflect.getOwnPropertyDescriptor(target, prop);
			}

			// assume fallback is frozen
			return {
				value: undefined,
				writable: true,
				enumerable: true,
				configurable: true,
			};
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

			let value = Reflect.get(target, prop);
			if (Reflect.has(target, prop)) {
				// debug( "handler:get", prop, { isProxy: util.types.isProxy(value), hasFallback: Reflect.has(fallback, prop) } );
				if (isPlainObject(value) && Reflect.has(fallback, prop)) {
					let ret = wrapObject(value, Reflect.get(fallback, prop));
					debug("  handler:get (object)", prop, "found on primary ****", ret);
					return ret;
				}

				debug("  handler:get (not object)", prop, "found on primary ****");
				return value;
			}

			// Does not exist in primary
			if (Reflect.has(fallback, prop)) {
				// fallback has prop
				let fallbackValue = Reflect.get(fallback, prop);

				if (isPlainObject(fallbackValue)) {
					debug("  > proxying (fallback has prop)", { fallback, prop, fallbackValue });
					// set empty object on primary
					Reflect.set(target, prop, {});

					return wrapObject(Reflect.get(target, prop), fallbackValue);
				}

				debug("  > returning (fallback has prop, not object)", { prop, fallbackValue });
				return fallbackValue;
			}

			// primary *and* fallback do _not_ have prop
			debug("  > returning (primary and fallback missing prop)", { prop, value });
			return value;
		},
		set(target, prop, value) {
			debug("handler:set", { target, prop, value });
			return Reflect.set(target, prop, value);
		},
	});
}

function ProxyWrap(target, fallback) {
	if (!isPlainObject(target) || !isPlainObject(fallback)) {
		throw new Error("ProxyWrap expects objects for both the target and fallback");
	}
	let wrapped = wrapObject(target, fallback);
	return wrapped;
}

export { ProxyWrap };
