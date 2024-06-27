class EleventyReservedDataError extends TypeError {}

class ReservedData {
	static properties = [
		// "pkg", // Object.freeze’d upstream
		// "eleventy", // Object.freeze’d upstream
		// "page" is only frozen for specific subproperties below
		"content",
		"collections",
	];

	static pageProperties = [
		"date",
		"inputPath",
		"fileSlug",
		"filePathStem",
		"outputFileExtension",
		"templateSyntax",
		"url",
		"outputPath",
		// not yet `excerpt` or `lang` set via front matter and computed data
	];

	// Check in the data cascade for reserved data properties.
	static getReservedKeys(data) {
		if (!data) {
			return [];
		}

		let keys = this.properties.filter((key) => {
			return key in data;
		});

		if ("page" in data) {
			if (typeof data.page === "object") {
				for (let key of this.pageProperties) {
					if (key in data.page) {
						keys.push(`page.${key}`);
					}
				}
			} else {
				// fail `page` when set to non-object values.
				keys.push("page");
			}
		}
		return keys;
	}

	static check(data) {
		let reserved = ReservedData.getReservedKeys(data);
		if (reserved.length === 0) {
			return;
		}

		let error = new EleventyReservedDataError(
			`Cannot override reserved Eleventy properties: ${reserved.join(", ")}`,
		);

		error.reservedNames = reserved;

		throw error;
	}

	static isReservedDataError(e) {
		return e instanceof EleventyReservedDataError;
	}
}

export default ReservedData;
