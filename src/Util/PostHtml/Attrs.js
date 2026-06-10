const PREFIXES = {
	eleventy: "eleventy:",
	buildawesome: "buildawesome:",
};

export function resolveAttributeName(attrs = {}, attrName = "") {
	let [prefix, name] = attrName.split(":");
	if (PREFIXES.eleventy + name in attrs) {
		return PREFIXES.eleventy + name;
	}
	if (PREFIXES.buildawesome + name in attrs) {
		return PREFIXES.buildawesome + name;
	}
}

export function hasAttribute(attrs = {}, attrName = "") {
	let resolved = resolveAttributeName(attrName);
	return attrs[resolved] !== undefined;
}
