const copy = require("recursive-copy");
const fs = require("fs");
const path = require("path");
const TemplatePath = require("./TemplatePath");
const debug = require("debug")("Eleventy:TemplatePassthrough");
const fastglob = require("fast-glob");
const EleventyBaseError = require("./EleventyBaseError");

class TemplatePassthroughError extends EleventyBaseError {}

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
    return path.normalize(TemplatePath.join(outputDir, outputPath));
    // .replace(/\\/g, "/"); // Fix for windows paths
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
    const files = await TemplatePath.addLeadingDotSlashArray(
      await fastglob.async(glob)
    );
    return files;
  }

  copy(src, dest, copyOptions) {
    if (
      TemplatePath.stripLeadingDotSlash(dest).includes(
        TemplatePath.stripLeadingDotSlash(this.outputDir)
      )
    ) {
      return copy(src, dest, copyOptions);
    }
    return Promise.reject(
      new TemplatePassthroughError(
        "Destination is not in the site output directory. Check your passthrough paths."
      )
    );
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
        return this.copy(this.inputPath, this.getOutputPath(), copyOptions);
      }

      // If not directory or file, attempt to get globs
      const files = await this.getFiles(this.inputPath);

      const promises = files.map(inputFile =>
        this.copy(inputFile, this.getGlobOutputPath(inputFile), copyOptions)
      );

      return Promise.all(promises).catch(err => {
        throw new TemplatePassthroughError(
          `Error copying passthrough files: ${err.message}`,
          err
        );
      });
    }
  }
}

module.exports = TemplatePassthrough;
