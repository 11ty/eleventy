const { compile } = require("path-to-regexp");

function stringify(url, urlData = {}) {
  let fn = compile(url, { encode: encodeURIComponent });
  return fn(urlData);
}

module.exports = function (url, urlData = {}) {
  if (Array.isArray(url)) {
    return url.slice().map((entry) => stringify(entry, urlData));
  }

  return stringify(url, urlData);
};
