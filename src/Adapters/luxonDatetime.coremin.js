export function fromISOtoDateUTC(dateValue) {
	return new Date(Date.parse(dateValue));
}

// Used by eleventyConfig.DateTime for Eleventy plugins
export const DateTime = undefined;
