import { Readable } from "node:stream";

export function createNewStream() {
	return new Readable({
		read() {},
	});
}
