// Plugin compatibility will not be checked in minimal bundle (but is available in standard client bundle)
// Saves ~38 KB in the client bundle!
export function satisfies() {
	// No checking here, returns true
	return true;
}

export function coerce(version) {
	// No coercion either!
	return version;
}
