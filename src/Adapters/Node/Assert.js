import assert from "node:assert";

export function deepEqual(actual, expected) {
	try {
		assert.deepStrictEqual(actual, expected);
		return false;
	} catch (e) {
		return true;
	}
}
