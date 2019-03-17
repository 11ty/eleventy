const copy = require("recursive-copy");
const TemplatePath = require("./TemplatePath");
const debug = require("debug")("Eleventy:TemplatePassthrough");

class TemplatePassthrough {
  constructor(path, outputDir, inputDir) {
    this.inputPath = path.inputPath;
    this.outputPath = path.outputPath;
    this.outputDir = outputDir;
    this.inputDir = inputDir;
    this.isDryRun = false;
  }

  getOutputPath() {
    const { inputDir, outputDir, inputPath, outputPath } = this;
    // assuming if paths are the same an outputPath was not set and we will resolve manually?
    const path =
      outputPath === inputPath
        ? TemplatePath.stripLeadingSubPath(outputPath, inputDir)
        : outputPath;
    return TemplatePath.join(outputDir, path);
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;
  }

  async write() {
    if (!this.isDryRun) {
      debug("Copying %o", this.inputPath);

      return copy(this.inputPath, this.getOutputPath(), {
        overwrite: true,
        dot: true,
        junk: false,
        results: false
      });
    }
  }
}

module.exports = TemplatePassthrough;
