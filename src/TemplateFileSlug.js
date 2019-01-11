const TemplatePath = require("./TemplatePath");

class TemplateFileSlug {
  constructor(inputPath, inputDir) {
    if (inputDir) {
      inputPath = TemplatePath.stripLeadingSubPath(inputPath, inputDir);
    }

    this.inputPath = inputPath;
    this.cleanInputPath = inputPath.replace(/^.\//, "");

    let dirs = this.cleanInputPath.split("/");
    this.filename = dirs.pop();
    this.dirs = dirs;

    let split = this.filename.split(".");
    split.pop();
    this.filenameNoExt = split.join(".");
  }

  getSlug() {
    let reg = this.filenameNoExt.match(/\d{4}-\d{2}-\d{2}-(.*)/);
    let slug = this.filenameNoExt;
    if (reg) {
      slug = reg[1];
    }

    if (slug === "index") {
      return this.dirs.length ? this.dirs[this.dirs.length - 1] : "";
    }

    return slug;
  }
}

module.exports = TemplateFileSlug;
