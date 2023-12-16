import os from 'node:os';

function normalizeNewLines(str) {
  return str.replace(/\r\n/g, "\n");
}

function localizeNewLines(str) {
  return normalizeNewLines(str).replace(/\n/g, os.EOL);
}

export {
  normalizeNewLines,
  localizeNewLines,
};
