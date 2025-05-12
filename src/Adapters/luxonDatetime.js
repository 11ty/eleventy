import debugUtil from "debug";
import { DateTime } from "luxon";

const debug = debugUtil("Eleventy:DateTime");

export function fromISOtoDateUTC(dateValue, inputPath) {
	let date = DateTime.fromISO(dateValue, { zone: "utc" });

	if (!date.isValid) {
		throw new Error(
			`Data cascade value for \`date\` (${dateValue}) is invalid${inputPath ? ` for ${inputPath}` : ""}`,
		);
	}

	debug("Luxon parsed %o: %o and %o", dateValue, date, date.toJSDate());
	return date.toJSDate();
}

export { DateTime };
