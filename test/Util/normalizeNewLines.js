function normalizeNewLines(str) {
  return str.replace(/\r\n/g, "\n");
}

function normalizeNewLinesInObject(obj) {
	for(let key in obj) {
		if(typeof obj[key] === "string") {
			obj[key] = normalizeNewLines(obj[key]);
		}
	}
}

export {
	normalizeNewLines,
	normalizeNewLinesInObject,
};
