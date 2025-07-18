export function fromISOtoDateUTC(dateValue, inputPath) {
	let d = Date.parse(dateValue);
	if (isNaN(d)) {
		throw new Error(
			`Data cascade value for \`date\` (${dateValue}) could not be parsed via Date.parse()${inputPath ? ` for ${inputPath}` : ""}. You can configure this behavior using eleventyConfig.addDateParsing: https://www.11ty.dev/docs/dates/#configuration-api-for-custom-date-parsing`,
		);
	}
	return new Date(d);
}
