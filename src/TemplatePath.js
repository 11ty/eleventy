const path = require("path");
const normalize = require("normalize-path");
const parsePath = require("parse-filepath");
const fs = require("fs-extra");

function TemplatePath() {}

/**
 * @returns {String} the absolute path to Eleventy’s project directory.
 */
TemplatePath.getWorkingDir = function() {
  return TemplatePath.normalize(path.resolve("."));
};

/**
 * Returns the directory portion of a path.
 * Works for directory and file paths and paths ending in a glob pattern.
 *
 * @param {String} path A path
 * @returns {String} the directory portion of a path.
 */
TemplatePath.getDir = function(path) {
  if (TemplatePath.isDirectorySync(path)) {
    return path;
  }

  return TemplatePath.getDirFromFilePath(path);
};

/**
 * Returns the directory portion of a path that either points to a file
 * or ends in a glob pattern. If `path` points to a directory,
 * the returned value will have its last path segment stripped
 * due to how [`parsePath`][1] works.
 *
 * [1]: https://www.npmjs.com/package/parse-filepath
 *
 * @param {String} path A path
 * @returns {String} the directory portion of a path.
 */
TemplatePath.getDirFromFilePath = function(path) {
  return parsePath(path).dir || ".";
};

/**
 * Returns the last path segment in a path (no leading/trailing slashes).
 *
 * Assumes [`parsePath`][1] was called on `path` before.
 *
 * [1]: https://www.npmjs.com/package/parse-filepath
 *
 * @param {String} path A path
 * @returns {String} the last path segment in a path
 */
TemplatePath.getLastPathSegment = function(path) {
  if (!path.includes("/")) {
    return path;
  }

  // Trim a trailing slash if there is one
  path = path.replace(/\/$/, "");

  return path.substr(path.lastIndexOf("/") + 1);
};

/**
 * @param {String} path A path
 * @returns {String[]} an array of paths pointing to each path segment of the
 * provided `path`.
 */
TemplatePath.getAllDirs = function(path) {
  // Trim a trailing slash if there is one
  path = path.replace(/\/$/, "");

  if (!path.includes("/")) {
    return [path];
  }

  return path
    .split("/")
    .map(segment => path.substring(0, path.indexOf(segment) + segment.length))
    .filter(path => path !== ".");
};

/**
 * Normalizes a path, resolving single-dot and double-dot segments.
 *
 * Node.js’ [`path.normalize`][1] is called to strip a possible leading `"./"` segment.
 *
 * [1]: https://nodejs.org/api/path.html#path_path_normalize_path
 *
 * @param {String} thePath The path that should be normalized.
 * @returns {String} the normalized path.
 */
TemplatePath.normalize = function(thePath) {
  return normalize(path.normalize(thePath));
};

/**
 * Joins all given path segments together.
 *
 * It uses Node.js’ [`path.join`][1] method and the [normalize-path][2] package.
 *
 * [1]: https://nodejs.org/api/path.html#path_path_join_paths
 * [2]: https://www.npmjs.com/package/normalize-path
 *
 * @param {String[]} paths An arbitrary amount of path segments.
 * @returns {String} the normalized and joined path.
 */
TemplatePath.join = function(...paths) {
  return normalize(path.join(...paths));
};

/**
 * Determines whether a path ends in a path separating character.
 *
 * @param {String|undefined} path
 * @param {Boolean} pathIsNormalized
 * @returns {Boolean} whether `path` ends with a path separating character.
 */
TemplatePath.hasTrailingSlash = function(path, pathIsNormalized = false) {
  if (path === undefined || path.length === 0) {
    return false;
  }

  let pathSeparator = "/";
  // Handle Windows path separators
  if (pathIsNormalized && process.platform === "win32") {
    pathSeparator = "\\";
  }

  return path.endsWith(pathSeparator);
};

/**
 * Joins the given URL path segments and normalizes the resulting path.
 * Maintains traling path separators.
 *
 * @param {String[]} urlPaths
 * @returns {String} a normalized URL path described by the given URL path segments.
 */
TemplatePath.normalizeUrlPath = function(...urlPaths) {
  const urlPath = path.join(...urlPaths);
  const hasTrailingSlashBefore = TemplatePath.hasTrailingSlash(urlPath, true);
  const normalizedUrlPath = normalize(urlPath);
  const hasTrailingSlashAfter = TemplatePath.hasTrailingSlash(
    normalizedUrlPath
  );

  return (
    normalizedUrlPath +
    (hasTrailingSlashBefore && !hasTrailingSlashAfter ? "/" : "")
  );
};

/**
 * Joins the given path segments. Since the first path is absolute,
 * the resulting path will be absolute as well.
 *
 * @param {String[]} paths
 * @returns {String} the absolute path described by the given path segments.
 */
TemplatePath.absolutePath = function(...paths) {
  return TemplatePath.join(TemplatePath.getWorkingDir(), ...paths);
};

/**
 * Turns an absolute path into a path relative Eleventy’s project directory.
 *
 * @param {String} absolutePath
 * @returns {String} the relative path.
 */
TemplatePath.relativePath = function(absolutePath) {
  return TemplatePath.stripPathFromDir(
    absolutePath,
    TemplatePath.getWorkingDir()
  );
};

/**
 * Adds a leading dot-slash segment to each path in the `paths` array.
 *
 * @param {String[]} paths
 * @returns {String[]}
 */
TemplatePath.addLeadingDotSlashArray = function(paths) {
  return paths.map(path => TemplatePath.addLeadingDotSlash(path));
};

/**
 * Adds a leading dot-slash segment to `path`.
 *
 * @param {String} path
 * @returns {String}
 */
TemplatePath.addLeadingDotSlash = function(path) {
  if (path === "." || path === "..") {
    return path + "/";
  }

  if (path.startsWith("/") || path.startsWith("./") || path.startsWith("../")) {
    return path;
  }

  return "./" + path;
};

/**
 * Removes a leading dot-slash segment.
 *
 * @param {String} path
 * @returns {String} the `path` without a leading dot-slash segment.
 */
TemplatePath.stripLeadingDotSlash = function(path) {
  return path.replace(/^\.\//, "");
};

/**
 * Determines whether a path starts with a given sub path.
 *
 * @param {String} path A path
 * @param {String} subPath A path
 * @returns {Boolean} whether `path` starts with `subPath`.
 */
TemplatePath.startsWithSubPath = function(path, subPath) {
  path = TemplatePath.normalize(path);
  subPath = TemplatePath.normalize(subPath);

  return path.startsWith(subPath);
};

TemplatePath.stripLeadingDots = function(str) {
  return str.replace(/^\.*/, "");
};

TemplatePath.stripPathFromDir = function(targetDir, prunedPath) {
  targetDir = TemplatePath.stripLeadingDotSlash(normalize(targetDir));
  prunedPath = TemplatePath.stripLeadingDotSlash(normalize(prunedPath));

  if (prunedPath && prunedPath !== "." && targetDir.indexOf(prunedPath) === 0) {
    return targetDir.substr(prunedPath.length + 1);
  }

  return targetDir;
};

TemplatePath.isDirectorySync = function(path) {
  return fs.existsSync(path) && fs.statSync(path).isDirectory();
};

TemplatePath.convertToGlob = function(path) {
  if (!path) {
    return "./**";
  }

  path = TemplatePath.addLeadingDotSlash(path);

  if (TemplatePath.isDirectorySync(path)) {
    return path + (!TemplatePath.hasTrailingSlash(path) ? "/" : "") + "**";
  }

  return path;
};

TemplatePath.getExtension = function(path) {
  let split = path.split(".");
  if (split.length > 1) {
    return split.pop();
  }
  return "";
};

TemplatePath.removeExtension = function(path, extension) {
  let split = path.split(".");

  // only remove extension if extension is passed in and an extension is found
  if (extension && split.length > 1) {
    let ext = split.pop();
    if (extension.charAt(0) === ".") {
      extension = extension.substr(1);
    }
    return split.join(".") + (!extension || ext === extension ? "" : "." + ext);
  }

  return path;
};

/**
 * USE ONLY IN TESTS.
 *
 * @returns {String} the absolute path to this module.
 */
TemplatePath._getModuleDir = function() {
  return path.resolve(__dirname, "..");
};

module.exports = TemplatePath;
