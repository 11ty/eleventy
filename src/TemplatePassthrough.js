const copy = require("recursive-copy");
const fs = require("fs");
const TemplatePath = require("./TemplatePath");
const debug = require("debug")("Eleventy:TemplatePassthrough");
const fastglob = require("fast-glob");

class TemplatePassthrough {
  constructor(path, outputDir, inputDir) {
    this.inputPath = path.inputPath;
    this.outputPath = path.outputPath;
    this.outputDir = outputDir;
    this.inputDir = inputDir;
    this.isDryRun = false;
  }

  getOutputPath() {
    const { inputDir, outputDir, outputPath, inputPath } = this;

    if (outputPath === true) {
      return TemplatePath.join(
        outputDir,
        TemplatePath.stripLeadingSubPath(inputPath, inputDir)
      );
    }
    return TemplatePath.join(outputDir, outputPath);
  }

  getGlobOutputPath(globFile) {
    return TemplatePath.join(
      this.getOutputPath(),
      TemplatePath.getLastPathSegment(globFile)
    );
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;
  }

  async getFiles(glob) {
    debug("Searching for: %o", glob);
    return TemplatePath.addLeadingDotSlashArray(await fastglob.async(glob));
  }

  async write() {
    const copyOptions = {
      overwrite: true,
      dot: true,
      junk: false,
      results: false
    };

    if (!this.isDryRun) {
      debug("Copying %o", this.inputPath);

      const isDirectory = TemplatePath.isDirectorySync(this.inputPath);
      const isFile = fs.existsSync(this.inputPath);
      // If directory or file, recursive copy
      if (isDirectory || isFile) {
        return copy(this.inputPath, this.getOutputPath(), copyOptions);
      }

      // If not directory or file, attempt to get globs
      const files = await this.getFiles(this.inputPath);
      return files.forEach(inputFile => {
        return copy(inputFile, this.getGlobOutputPath(inputFile), copyOptions);
      });
    }
  }
}

module.exports = TemplatePassthrough;
