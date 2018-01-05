const globby = require("globby");
const parsePath = require("parse-filepath");
const Path = require("./TemplatePath");
const Sortable = require("./Util/Sortable");

class TemplateCollection extends Sortable {
  constructor() {
    super();
  }

  getTemplatePathIndex(files) {
    if (!this.templatePath) {
      return -1;
    }

    return (files || []).indexOf(this.templatePath);
  }

  async getSortedFiles() {
    let files = await this.getFiles();
    let sortFn = this.getSortFunction();
    return files.sort(sortFn);
  }

  async getFiles() {
    if (!this.globSelector) {
      throw new Error(
        "TemplateCollection->getFiles() requires you to `setGlob` first."
      );
    }

    return globby(this.globSelector, { gitignore: true });
  }
}
module.exports = TemplateCollection;
