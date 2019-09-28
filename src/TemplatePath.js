const path = require("path");
const normalize = require("normalize-path");
const parsePath = require("parse-filepath");
const fs = require("fs-extra");

class TemplatePath {
  /**
   * @returns {string} the absolute path to Eleventy’s project directory.
   */
  static getWorkingDir() {
    return TemplatePath.normalize(path.resolve("."));
  }

  /**
   * Returns the directory portion of a path.
   * Works for directory and file paths and paths ending in a glob pattern.
   *
   * @param {string} path A path
   * @returns {string} the directory portion of a path.
   */
  static getDir(path) {
    if (TemplatePath.isDirectorySync(path)) {
      return path;
    }

    return TemplatePath.getDirFromFilePath(path);
  }

  /**
   * Returns the directory portion of a path that either points to a file
   * or ends in a glob pattern. If `path` points to a directory,
   * the returned value will have its last path segment stripped
   * due to how [`parsePath`][1] works.
   *
   * [1]: https://www.npmjs.com/package/parse-filepath
   *
   * @param {string} path A path
   * @returns {string} the directory portion of a path.
   */
  static getDirFromFilePath(path) {
    return parsePath(path).dir || ".";
  }

  /**
   * Returns the last path segment in a path (no leading/trailing slashes).
   *
   * Assumes [`parsePath`][1] was called on `path` before.
   *
   * [1]: https://www.npmjs.com/package/parse-filepath
   *
   * @param {string} path A path
   * @returns {string} the last path segment in a path
   */
  static getLastPathSegment(path) {
    if (!path.includes("/")) {
      return path;
    }

    // Trim a trailing slash if there is one
    path = path.replace(/\/$/, "");

    return path.substr(path.lastIndexOf("/") + 1);
  }

  /**
   * @param {string} path A path
   * @returns {string[]} an array of paths pointing to each path segment of the
   * provided `path`.
   */
  static getAllDirs(path) {
    // Trim a trailing slash if there is one
    path = path.replace(/\/$/, "");

    if (!path.includes("/")) {
      return [path];
    }

    return path
      .split("/")
      .map((segment, index, array) => array.slice(0, index + 1).join("/"))
      .filter(path => path !== ".")
      .reverse();
  }

  /**
   * Normalizes a path, resolving single-dot and double-dot segments.
   *
   * Node.js’ [`path.normalize`][1] is called to strip a possible leading `"./"` segment.
   *
   * [1]: https://nodejs.org/api/path.html#path_path_normalize_path
   *
   * @param {string} thePath The path that should be normalized.
   * @returns {string} the normalized path.
   */
  static normalize(thePath) {
    return normalize(path.normalize(thePath));
  }

  /**
   * Joins all given path segments together.
   *
   * It uses Node.js’ [`path.join`][1] method and the [normalize-path][2] package.
   *
   * [1]: https://nodejs.org/api/path.html#path_path_join_paths
   * [2]: https://www.npmjs.com/package/normalize-path
   *
   * @param {string[]} paths An arbitrary amount of path segments.
   * @returns {string} the normalized and joined path.
   */
  static join(...paths) {
    return normalize(path.join(...paths));
  }

  /**
   * Joins the given URL path segments and normalizes the resulting path.
   * Maintains traling a single trailing slash if the last URL path argument
   * had atleast one.
   *
   * @param {string[]} urlPaths
   * @returns {string} a normalized URL path described by the given URL path segments.
   */
  static normalizeUrlPath(...urlPaths) {
    const urlPath = path.posix.join(...urlPaths);
    return urlPath.replace(/\/+$/, "/");
  }

  /**
   * Joins the given path segments. Since the first path is absolute,
   * the resulting path will be absolute as well.
   *
   * @param {string[]} paths
   * @returns {string} the absolute path described by the given path segments.
   */
  static absolutePath(...paths) {
    return TemplatePath.join(TemplatePath.getWorkingDir(), ...paths);
  }

  /**
   * Turns an absolute path into a path relative Eleventy’s project directory.
   *
   * @param {string} absolutePath
   * @returns {string} the relative path.
   */
  static relativePath(absolutePath) {
    return TemplatePath.stripLeadingSubPath(
      absolutePath,
      TemplatePath.getWorkingDir()
    );
  }

  /**
   * Adds a leading dot-slash segment to each path in the `paths` array.
   *
   * @param {string[]} paths
   * @returns {string[]}
   */
  static addLeadingDotSlashArray(paths) {
    return paths.map(path => TemplatePath.addLeadingDotSlash(path));
  }

  /**
   * Adds a leading dot-slash segment to `path`.
   *
   * @param {string} path
   * @returns {string}
   */
  static addLeadingDotSlash(path) {
    if (path === "." || path === "..") {
      return path + "/";
    }

    if (
      path.startsWith("/") ||
      path.startsWith("./") ||
      path.startsWith("../")
    ) {
      return path;
    }

    return "./" + path;
  }

  /**
   * Removes a leading dot-slash segment.
   *
   * @param {string} path
   * @returns {string} the `path` without a leading dot-slash segment.
   */
  static stripLeadingDotSlash(path) {
    return typeof path === "string" ? path.replace(/^\.\//, "") : path;
  }

  /**
   * Determines whether a path starts with a given sub path.
   *
   * @param {string} path A path
   * @param {string} subPath A path
   * @returns {boolean} whether `path` starts with `subPath`.
   */
  static startsWithSubPath(path, subPath) {
    path = TemplatePath.normalize(path);
    subPath = TemplatePath.normalize(subPath);

    return path.startsWith(subPath);
  }

  /**
   * Removes the `subPath` at the start of `path` if present
   * and returns the remainding path.
   *
   * @param {string} path A path
   * @param {string} subPath A path
   * @returns {string} the `path` without `subPath` at the start of it.
   */
  static stripLeadingSubPath(path, subPath) {
    path = TemplatePath.normalize(path);
    subPath = TemplatePath.normalize(subPath);

    if (subPath !== "." && path.startsWith(subPath)) {
      return path.substr(subPath.length + 1);
    }

    return path;
  }

  /**
   * @param {string} path A path
   * @returns {boolean} whether `path` points to an existing directory.
   */
  static isDirectorySync(path) {
    return fs.existsSync(path) && fs.statSync(path).isDirectory();
  }

  /**
   * Appends a recursive wildcard glob pattern to `path`
   * unless `path` is not a directory; then, `path` is assumed to be a file path
   * and is left unchaged.
   *
   * @param {string} path
   * @returns {string}
   */
  static convertToRecursiveGlob(path) {
    if (path === "") {
      return "./**";
    }

    path = TemplatePath.addLeadingDotSlash(path);

    if (TemplatePath.isDirectorySync(path)) {
      return path + (!path.endsWith("/") ? "/" : "") + "**";
    }

    return path;
  }

  /**
   * Returns the extension of the path without the leading dot.
   * If the path has no extensions, the empty string is returned.
   *
   * @param {string} thePath
   * @returns {string} the path’s extension if it exists;
   * otherwise, the empty string.
   */
  static getExtension(thePath) {
    return path.extname(thePath).replace(/^\./, "");
  }

  /**
   * Removes the extension from a path.
   *
   * @param {string} path
   * @param {string} extension
   * @returns {string}
   */
  static removeExtension(path, extension = undefined) {
    if (extension === undefined) {
      return path;
    }

    const pathExtension = TemplatePath.getExtension(path);
    if (pathExtension !== "" && extension.endsWith(pathExtension)) {
      return path.substring(0, path.lastIndexOf(pathExtension) - 1);
    }

    return path;
  }
}

module.exports = TemplatePath;
