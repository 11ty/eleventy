module.exports = function (url) {
  // https://github.com/11ty/eleventy/issues/2067
  if (url.endsWith("/*")) {
    return url.substring(0, url.length - 2) + "/(.*)";
  }
  return url;
};
