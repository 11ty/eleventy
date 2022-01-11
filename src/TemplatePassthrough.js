const fs = require("fs");
const isGlob = require("is-glob");
const copy = require("recursive-copy");
const TemplatePath = require("./TemplatePath");
const debug = require("debug")("Eleventy:TemplatePassthrough");
const fastglob = require("fast-glob");
const EleventyBaseError = require("./EleventyBaseError");

class TemplatePassthroughError extends EleventyBaseError {}

class TemplatePassthrough {
  constructor(path, outputDir, inputDir, config) {
    if (!config) {
      throw new TemplatePassthroughError("Missing `config`.");
    }
    this.config = config;
    this.benchmarks = {
      aggregate: this.config.benchmarkManager.get("Aggregate"),
    };

    this.rawPath = path;

    // inputPath is relative to the root of your project and not your Eleventy input directory.
    this.inputPath = path.inputPath;
    // inputDir is only used when stripping from output path in `getOutputPath`
    this.inputDir = inputDir;

    this.outputPath = path.outputPath;
    this.outputDir = outputDir;

    this.isDryRun = false;
  }

  getPath() {
    return this.rawPath;
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
    let b = this.benchmarks.aggregate.get("Searching the file system");
    b.before();
    const files = TemplatePath.addLeadingDotSlashArray(
      await fastglob(glob, {
        caseSensitiveMatch: false,
        dot: true,
      })
    );
    b.after();
    return files;
  }

  /* Types:
   * 1. via glob, individual files found
   * 2. directory, triggers an event for each file
   * 3. individual file
   */
  async copy(src, dest, copyOptions) {
    if (
      !TemplatePath.stripLeadingDotSlash(dest).includes(
        TemplatePath.stripLeadingDotSlash(this.outputDir)
      )
    ) {
      return Promise.reject(
        new TemplatePassthroughError(
          "Destination is not in the site output directory. Check your passthrough paths."
        )
      );
    }

    let fileCopyCount = 0;
    let map = {};

    // returns a promise
    return copy(src, dest, copyOptions)
      .on(copy.events.COPY_FILE_START, (copyOp) => {
        // Access to individual files at `copyOp.src`
        debug("Copying individual file %o", copyOp.src);
        map[copyOp.src] = copyOp.dest;
        this.benchmarks.aggregate.get("Passthrough Copy File").before();
      })
      .on(copy.events.COPY_FILE_COMPLETE, () => {
        fileCopyCount++;
        this.benchmarks.aggregate.get("Passthrough Copy File").after();
      })
      .then(() => {
        return {
          count: fileCopyCount,
          map,
        };
      });
  }

  async write() {
    if (this.isDryRun) {
      return Promise.resolve({
        count: 0,
        map: {},
      });
    }

    const copyOptions = {
      overwrite: true,
      dot: true,
      junk: false,
      results: false,
    };
    let promises = [];

    debug("Copying %o", this.inputPath);

    if (!isGlob(this.inputPath) && fs.existsSync(this.inputPath)) {
      // IMPORTANT: this returns a promise, does not await for promise to finish
      promises.push(
        this.copy(this.inputPath, this.getOutputPath(), copyOptions)
      );
    } else {
      // If not directory or file, attempt to get globs
      let files = await this.getFiles(this.inputPath);

      promises = files.map((inputFile) => {
        let target = this.getOutputPath(inputFile);
        return this.copy(inputFile, target, copyOptions);
      });
    }

    // IMPORTANT: this returns an array of promises, does not await for promise to finish
    return Promise.all(promises)
      .then((results) => {
        // collate the count and input/output map results from the array.
        let count = 0;
        let map = {};

        for (let result of results) {
          count += result.count;
          Object.assign(map, result.map);
        }

        return {
          count,
          map,
        };
      })
      .catch((err) => {
        throw new TemplatePassthroughError(
          `Error copying passthrough files: ${err.message}`,
          err
        );
      });
  }
}

module.exports = TemplatePassthrough;
