import { EleventyLoadContent } from "../../Util/Require.js";

export function clearRequireCache(absolutePath) {
	// no-op
}

export function importJsonSync(path) {
	// should not be a no-op
	let rawInput = EleventyLoadContent(path);
	if (!rawInput) {
		// should not error when file exists but is _empty_
		return;
	}
	return JSON.parse(rawInput);
}
