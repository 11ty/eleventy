export function fromISOtoDateUTC(dateValue) {
	return new Date(Date.parse(dateValue));
}
