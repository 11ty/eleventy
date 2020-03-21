const copy = require("recursive-copy");
const TemplatePath = require("./TemplatePath");
const debug = require("debug")("Eleventy:TemplatePassthrough");
const fastglob = require("fast-glob");
const EleventyBaseError = require("./EleventyBaseError");
//const bench = require("./BenchmarkManager").get("PassthroughCopy");

class TemplatePassthroughError extends EleventyBaseError {}

class TemplatePassthrough {
  constructor(path, outputDir, inputDir) {
    // inputPath is relative to the root of your project and not your Eleventy input directory.
    this.inputPath = path.inputPath;
    // inputDir is only used when stripping from output path in `getOutputPath`
    this.inputDir = inputDir;

    this.outputPath = path.outputPath;
    this.outputDir = outputDir;

    this.isDryRun = false;
  }

  getOutputPath(inputFileFromGlob) {
    const { inputDir, outputDir, outputPath, inputPath } = this;

    if (outputPath === true) {
      return TemplatePath.normalize(
        TemplatePath.join(
          outputDir,
          TemplatePath.stripLeadingSubPath(
            inputFileFromGlob || inputPath,
            inputDir
          )
        )
      );
    }

    if (inputFileFromGlob) {
      return this.getOutputPathForGlobFile(inputFileFromGlob);
    }

    return TemplatePath.normalize(TemplatePath.join(outputDir, outputPath));
  }

  getOutputPathForGlobFile(inputFileFromGlob) {
    return TemplatePath.join(
      this.getOutputPath(),
      TemplatePath.getLastPathSegment(inputFileFromGlob)
    );
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;
  }

  async getFiles(glob) {
    debug("Searching for: %o", glob);
    const files = TemplatePath.addLeadingDotSlashArray(
      await fastglob(glob, {
        caseSensitiveMatch: false,
        dot: true
      })
    );
    return files;
  }

  async copy(src, dest, copyOptions) {
    if (
      TemplatePath.stripLeadingDotSlash(dest).includes(
        TemplatePath.stripLeadingDotSlash(this.outputDir)
      )
    ) {
      // Uncomment this if you want to add benchmarking to copy
      // (Warning, it seems to be noisy and low value feedback)
      // return bench.addAsync(`Copying ${src}`, function() {
      //  // copy() returns a promise
      //  return copy(src, dest, copyOptions);
      // });

      // copy() returns a promise
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

      // If directory or file, recursive copy
      if (await TemplatePath.exists(this.inputPath)) {
        // IMPORTANT: this returns a promise, does not await for promise to finish
        return this.copy(this.inputPath, this.getOutputPath(), copyOptions);
      }

      // If not directory or file, attempt to get globs
      const files = await this.getFiles(this.inputPath);

      const promises = files.map(inputFile =>
        this.copy(inputFile, this.getOutputPath(inputFile), copyOptions)
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
