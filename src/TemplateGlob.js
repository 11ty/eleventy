const TemplatePath = require("./TemplatePath");

class TemplateGlob {
  /**
   * Normalizes a path containing glob patterns.
   *
   * @param  {string[]} paths
   * @returns {string}
   */
  static normalizePath(...paths) {
    if (paths[0].charAt(0) === "!") {
      throw new Error(
        `TemplateGlob.normalizePath does not accept ! glob paths like: ${paths.join(
          ""
        )}`
      );
    }

    return TemplatePath.addLeadingDotSlash(TemplatePath.join(...paths));
  }

  /**
   * Normalizes paths containing glob patterns.
   *
   * @param {string} path
   * @returns {string}
   */
  static normalize(path) {
    if (path.charAt(0) === "!") {
      return "!" + TemplateGlob.normalizePath(path.substr(1));
    } else {
      return TemplateGlob.normalizePath(path);
    }
  }
}

module.exports = TemplateGlob;
