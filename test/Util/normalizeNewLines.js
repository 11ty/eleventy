function normalizeNewLines(str) {
  return str.replace(/\r\n/g, "\n");
}

module.exports = normalizeNewLines;
