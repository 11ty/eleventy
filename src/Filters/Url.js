const validUrl = require("valid-url");
const TemplatePath = require("../TemplatePath");

module.exports = function(url, pathPrefix) {
  if (pathPrefix === undefined || typeof pathPrefix !== "string") {
    let projectConfig = require("../Config").getConfig();
    pathPrefix = projectConfig.pathPrefix;
  }

  if (
    validUrl.isUri(url) ||
    url.indexOf("http://") === 0 ||
    url.indexOf("https://") === 0
  ) {
    return url;
  }

  let normUrl = TemplatePath.normalizeUrlPath(url);
  let normRootDir = TemplatePath.normalizeUrlPath("/", pathPrefix);
  let normFull = TemplatePath.normalizeUrlPath("/", pathPrefix, url);
  let isRootDirTrailingSlash =
    normRootDir.length && normRootDir.charAt(normRootDir.length - 1) === "/";
  let isUrlTrailingSlash = url.length && url.charAt(url.length - 1) === "/";

  // minor difference with straight `normalize`, "" resolves to root dir and not "."
  // minor difference with straight `normalize`, "/" resolves to root dir
  if (!url || normUrl === "/" || normUrl === normRootDir) {
    return normRootDir + (!isRootDirTrailingSlash ? "/" : "");
  } else if (
    url === ".." ||
    url.indexOf("../") === 0 ||
    url === "." ||
    url.indexOf("./") === 0
  ) {
    return normUrl;
  }

  return normFull;
};
