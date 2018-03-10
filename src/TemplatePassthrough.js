const fs = require("fs-extra");
const TemplatePath = require("./TemplatePath");
const debug = require("debug")("Eleventy:TemplatePassthrough");

class TemplatePassthrough {
  constructor(inputPath, outputDir) {
    this.path = inputPath;
    this.outputDir = outputDir;
    this.isDryRun = false;
  }

  getOutputPath() {
    return TemplatePath.normalize(this.outputDir, this.path);
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;
  }

  async write() {
    // debug(
    //   `${this.path} has no TemplateEngine engine and will copy to ${
    //     this.outputDir
    //   }`
    // );

    if (!this.isDryRun) {
      return fs.copy(this.path, this.getOutputPath());
    }
  }
}

module.exports = TemplatePassthrough;
