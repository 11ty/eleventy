import { Readable } from "node:stream";

export function getReadableStream() {
	return new Readable({
		read() {},
	});
}
