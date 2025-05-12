// Plugin compatibility will not be checked clientside
// Saves ~38 KB in the client bundle!
export function satisfies() {
	// No checking here, sorry!
	return true;
}

export function coerce(version) {
	// No coercion either!
	return version;
}
