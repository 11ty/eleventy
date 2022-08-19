function removeNewLines(str) {
  return str.replace(/[\r\n]*/g, "");
}

export default removeNewLines;
