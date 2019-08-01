const parsePath = require("parse-filepath");
const TemplatePath = require("./TemplatePath");
const EleventyExtensionMap = require("./EleventyExtensionMap");

class TemplateFileSlug {
  constructor(inputPath, inputDir) {
    if (inputDir) {
      inputPath = TemplatePath.stripLeadingSubPath(inputPath, inputDir);
    }

    this.inputPath = inputPath;
    this.cleanInputPath = inputPath.replace(/^.\//, "");

    let dirs = this.cleanInputPath.split("/");
    this.dirs = dirs;
    this.dirs.pop();

    this.parsed = parsePath(inputPath);
    // TODO update this after the fix for issue #117 merges
    this.filenameNoExt = EleventyExtensionMap.removeTemplateExtension(
      this.parsed.base
    );
  }

  getFullPathWithoutExtension() {
    return "/" + TemplatePath.join(...this.dirs, this._getRawSlug());
  }

  _getRawSlug() {
    let slug = this.filenameNoExt;
    let reg = slug.match(/\d{4}-\d{2}-\d{2}-(.*)/);
    if (reg) {
      return reg[1];
    }
    return slug;
  }

  getSlug() {
    let rawSlug = this._getRawSlug();

    if (rawSlug === "index") {
      return this.dirs.length ? this.dirs[this.dirs.length - 1] : "";
    }

    return rawSlug;
  }
}

module.exports = TemplateFileSlug;
