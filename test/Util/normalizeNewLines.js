function normalizeNewLines(str) {
  return str.replace(/\r/g, "");
}

module.exports = normalizeNewLines;
