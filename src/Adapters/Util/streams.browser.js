// We *could* use ReadableStream global (available in Node and browser) but this is a breaking change to the API of ndjson feature

// ndjson is being removed
// https://github.com/11ty/eleventy/issues/3382
export function getReadableStream() {
	// return new ReadableStream();
	throw new Error("Feature not supported in browser.");
}
