export function deepEqual(actual, expected) {
	// not quite as good as `node:assert` but an okay substitute
	return JSON.stringify(actual) === JSON.stringify(expected);
}
