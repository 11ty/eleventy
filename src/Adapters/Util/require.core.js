import { EleventyLoadContent } from "../../Util/Require.js";
import eleventyPackageJson from "../../../package.json" with { type: "json" };

// We *could* prune everything but `name`, `version`, and `type` here but esbuild will still bundle the entire package.json
export { eleventyPackageJson };

// noop
export function clearRequireCache(absolutePath) {}

export function importJsonSync(path) {
	// should not be a no-op
	let rawInput = EleventyLoadContent(path);
	if (!rawInput) {
		// should not error when file exists but is _empty_
		return;
	}
	return JSON.parse(rawInput);
}
