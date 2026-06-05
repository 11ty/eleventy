import * as process from "./process.cjs";

// `path` polyfill needs this
window.process = globalThis.process = process;

// `recursive-copy` needs this (not necessary for Core.js)
window.global = globalThis || window;

// @11ty/eleventy needs this
class Buffer {
	static [Symbol.hasInstance](instance) {
		return this.isBuffer(instance);
	}

	static isBuffer() {
		return false;
	}
}

window.Buffer = globalThis.Buffer = Buffer;
