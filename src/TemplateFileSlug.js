const path = require("path");
const { TemplatePath } = require("@11ty/eleventy-utils");

class TemplateFileSlug {
  constructor(inputPath, inputDir, extensionMap) {
    if (inputDir) {
      inputPath = TemplatePath.stripLeadingSubPath(inputPath, inputDir);
    }

    this.inputPath = inputPath;
    this.cleanInputPath = inputPath.replace(/^.\//, "");

    let dirs = this.cleanInputPath.split("/");
    this.dirs = dirs;
    this.dirs.pop();

    this.parsed = path.parse(inputPath);
    this.filenameNoExt = extensionMap.removeTemplateExtension(this.parsed.base);
  }

  // `page.filePathStem` see https://www.11ty.dev/docs/data-eleventy-supplied/#page-variable
  getFullPathWithoutExtension() {
    return "/" + TemplatePath.join(...this.dirs, this._getRawSlug());
  }

  _getRawSlug() {
    let slug = this.filenameNoExt;
    return this._stripDateFromSlug(slug);
  }

  /** Removes dates in the format of YYYY-MM-DD from a given slug string candidate. */
  _stripDateFromSlug(slug) {
    let reg = slug.match(/\d{4}-\d{2}-\d{2}-(.*)/);
    if (reg) {
      return reg[1];
    }
    return slug;
  }

  // `page.fileSlug` see https://www.11ty.dev/docs/data-eleventy-supplied/#page-variable
  getSlug() {
    let rawSlug = this._getRawSlug();

    if (rawSlug === "index") {
      if (!this.dirs.length) {
        return "";
      }
      let lastDir = this.dirs[this.dirs.length - 1];
      return this._stripDateFromSlug(lastDir);
    }

    return rawSlug;
  }
}

module.exports = TemplateFileSlug;
