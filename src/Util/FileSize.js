export function readableFileSize(bytes) {
	// Uses kilobytes and not kibibytes
	let entries = [
		[10e6, "mB"],
		[10e3, "kB"],
	];
	for (let [compare, suffix] of entries) {
		if (Math.abs(bytes) >= compare) {
			return Math.round(bytes / compare) + suffix;
		}
	}
	return bytes + " bytes";
}
