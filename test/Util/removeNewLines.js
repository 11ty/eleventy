function removeNewLines(str) {
  return str.replace(/[\r\n]*/g, "");
}

module.exports = removeNewLines;
