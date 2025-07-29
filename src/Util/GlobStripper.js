// import { TemplatePath } from "@11ty/eleventy-utils";
import { isDynamicPattern } from "./GlobMatcher.js";

export class GlobStripper {
	static SEP = "/";
	static DOUBLE = "**";
	static SINGLE = "*";

	static parse(pattern = "") {
		let parts = pattern.split(this.SEP);
		let c = 0;
		for (let p of parts) {
			// console.log( {p, c, parts}, parts.slice(0, 0), parts.slice(c) );
			if (p === this.DOUBLE || (p.includes(this.SINGLE) && !p.includes(this.DOUBLE))) {
				return {
					path: parts.slice(0, c).join(this.SEP) || ".",
					glob: parts.slice(c).join(this.SEP) || undefined,
					// fullPattern: TemplatePath.stripLeadingDotSlash(pattern),
				};
			}
			c++;
		}

		if (isDynamicPattern(pattern)) {
			throw new Error(
				`Could not automatically determine top-most folder from glob pattern: ${pattern}`,
			);
		}

		return {
			path: parts.join(this.SEP) || ".",
		};
	}
}
