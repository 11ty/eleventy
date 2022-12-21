const fs = require("fs");
const path = require("path");
const isGlob = require("is-glob");
const copy = require("recursive-copy");
const { TemplatePath } = require("@11ty/eleventy-utils");

const EleventyBaseError = require("./EleventyBaseError");
const checkPassthroughCopyBehavior = require("./Util/PassthroughCopyBehaviorCheck");

const debug = require("debug")("Eleventy:TemplatePassthrough");

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

    this.copyOptions = path.copyOptions; // custom options for recursive-copy

    this.isDryRun = false;
    this.isIncremental = false;
  }

  /* { inputPath, outputPath } though outputPath is *not* the full path: just the output directory */
  getPath() {
    return this.rawPath;
  }

  getOutputPath(inputFileFromGlob) {
    let { inputDir, outputDir, outputPath, inputPath } = this;

    if (outputPath === true) {
      return TemplatePath.normalize(
        TemplatePath.join(
          outputDir,
          TemplatePath.stripLeadingSubPath(inputFileFromGlob || inputPath, inputDir)
        )
      );
    }

    if (inputFileFromGlob) {
      return this.getOutputPathForGlobFile(inputFileFromGlob);
    }

    // Bug when copying incremental file overwriting output directory (and making it a file)
    // e.g. public/test.css -> _site
    // https://github.com/11ty/eleventy/issues/2278
    let fullOutputPath = TemplatePath.normalize(TemplatePath.join(outputDir, outputPath));

    if (
      fs.existsSync(inputPath) &&
      !TemplatePath.isDirectorySync(inputPath) &&
      TemplatePath.isDirectorySync(fullOutputPath)
    ) {
      let filename = path.parse(inputPath).base;
      return TemplatePath.normalize(TemplatePath.join(fullOutputPath, filename));
    }

    return fullOutputPath;
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

  setRunMode(runMode) {
    this.runMode = runMode;
  }

  setIsIncremental(isIncremental) {
    this.isIncremental = isIncremental;
  }

  setFileSystemSearch(fileSystemSearch) {
    this.fileSystemSearch = fileSystemSearch;
  }

  async getFiles(glob) {
    debug("Searching for: %o", glob);
    let b = this.benchmarks.aggregate.get("Searching the file system (passthrough)");
    b.before();
    let files = TemplatePath.addLeadingDotSlashArray(
      await this.fileSystemSearch.search("passthrough", glob)
    );
    b.after();
    return files;
  }

  // dir is guaranteed to exist by context
  // dir may not be a directory
  addTrailingSlashIfDirectory(dir) {
    if (dir && typeof dir === "string") {
      if (dir.endsWith(path.sep)) {
        return dir;
      }
      if (fs.statSync(dir).isDirectory()) {
        return `${dir}/`;
      }
    }
    return dir;
  }

  // maps input paths to output paths
  async getFileMap() {
    // TODO VirtualFileSystem candidate
    if (!isGlob(this.inputPath) && fs.existsSync(this.inputPath)) {
      // When inputPath is a directory, make sure it has a slash for passthrough copy aliasing
      // https://github.com/11ty/eleventy/issues/2709
      let inputPath = this.addTrailingSlashIfDirectory(this.inputPath);
      return [
        {
          inputPath,
          outputPath: this.getOutputPath(),
        },
      ];
    }

    let paths = [];
    // If not directory or file, attempt to get globs
    let files = await this.getFiles(this.inputPath);
    for (let inputPath of files) {
      paths.push({
        inputPath,
        outputPath: this.getOutputPath(inputPath),
      });
    }

    return paths;
  }

  /* Types:
   * 1. via glob, individual files found
   * 2. directory, triggers an event for each file
   * 3. individual file
   */
  async copy(src, dest, copyOptions) {
    if (
      !TemplatePath.stripLeadingDotSlash(dest).startsWith(
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
      .on(copy.events.COPY_FILE_COMPLETE, (copyOp) => {
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

    debug("Copying %o", this.inputPath);
    let fileMap = await this.getFileMap();

    // default options for recursive-copy
    // see https://www.npmjs.com/package/recursive-copy#arguments
    let copyOptionsDefault = {
      overwrite: true, // overwrite output. fails when input is directory (mkdir) and output is file
      dot: true, // copy dotfiles
      junk: false, // copy cache files like Thumbs.db
      results: false,
      expand: false, // follow symlinks (matches recursive-copy default)
      debug: false, // (matches recursive-copy default)

      // Note: `filter` callback function only passes in a relative path, which is unreliable
      // See https://github.com/timkendrick/recursive-copy/blob/4c9a8b8a4bf573285e9c4a649a30a2b59ccf441c/lib/copy.js#L59
      // e.g. `{ filePaths: [ './img/coolkid.jpg' ], relativePaths: [ '' ] }`
    };

    let copyOptions = Object.assign(copyOptionsDefault, this.copyOptions);

    let promises = fileMap.map((entry) => {
      // For-free passthrough copy
      if (checkPassthroughCopyBehavior(this.config, this.runMode)) {
        let aliasMap = {};
        aliasMap[entry.inputPath] = entry.outputPath;

        return Promise.resolve({
          count: 0,
          map: aliasMap,
        });
      }

      // Copy the files (only in build mode)
      return this.copy(entry.inputPath, entry.outputPath, copyOptions);
    });

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
        throw new TemplatePassthroughError(`Error copying passthrough files: ${err.message}`, err);
      });
  }
}

module.exports = TemplatePassthrough;
