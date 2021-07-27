const UrlPattern = require("url-pattern");

function stringify(url, urlData = {}) {
  let pattern = new UrlPattern(url);
  return pattern.stringify(urlData);
}

module.exports = function (url, urlData = {}) {
  if (Array.isArray(url)) {
    return url.slice().map((entry) => stringify(entry, urlData));
  }

  return stringify(url, urlData);
};
