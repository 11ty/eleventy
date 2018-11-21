const copy = require("recursive-copy");
const TemplatePath = require("./TemplatePath");
// const debug = require("debug")("Eleventy:TemplatePassthrough");

class TemplatePassthrough {
  constructor(inputPath, outputDir, inputDir) {
    this.path = inputPath;
    this.outputDir = outputDir;
    this.inputDir = inputDir;
    this.isDryRun = false;
  }

  getOutputPath() {
    return TemplatePath.normalize(
      this.outputDir,
      TemplatePath.stripPathFromDir(this.path, this.inputDir)
    );
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
      return copy(this.path, this.getOutputPath(), {
        overwrite: true,
        dot: true,
        junk: false,
        results: false
      });
    }
  }
}

module.exports = TemplatePassthrough;
