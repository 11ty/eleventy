const config = require("./Config");
const EleventyBaseError = require("./EleventyBaseError");
const TemplatePassthrough = require("./TemplatePassthrough");
const TemplateRender = require("./TemplateRender");
const TemplatePath = require("./TemplatePath");
const debug = require("debug")("Eleventy:TemplatePassthroughManager");

class TemplatePassthroughManagerCopyError extends EleventyBaseError {}

class TemplatePassthroughManager {
  constructor() {
    this.config = config.getConfig();
    this.reset();
  }

  reset() {
    this.count = 0;
    debug("Resetting counts to 0");
  }

  setConfig(configOverride) {
    this.config = configOverride || {};
  }

  setOutputDir(outputDir) {
    this.outputDir = outputDir;
  }

  setInputDir(inputDir) {
    this.inputDir = inputDir;
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;
  }

  _normalizePaths(path, outputPath) {
    return {
      inputPath: TemplatePath.addLeadingDotSlash(path),
      outputPath: outputPath
        ? TemplatePath.stripLeadingDotSlash(outputPath)
        : true
    };
  }

  getConfigPaths() {
    if (!this.config.passthroughFileCopy) {
      debug("`passthroughFileCopy` is disabled in config, bypassing.");
      return [];
    }

    let paths = [];
    let target = this.config.passthroughCopies || {};
    debug("`passthroughFileCopy` config paths: %o", target);
    for (let path in target) {
      paths.push(this._normalizePaths(path, target[path]));
    }
    debug("`passthroughFileCopy` config normalized paths: %o", paths);
    return paths;
  }

  getConfigPathGlobs() {
    return this.getConfigPaths().map(path => {
      return TemplatePath.convertToRecursiveGlob(path.inputPath);
    });
  }

  getFilePaths(paths) {
    if (!this.config.passthroughFileCopy) {
      debug("`passthroughFileCopy` is disabled in config, bypassing.");
      return [];
    }

    let matches = [];
    for (let path of paths) {
      if (!TemplateRender.hasEngine(path)) {
        matches.push(path);
      }
    }

    return matches;
  }

  getCopyCount() {
    return this.count;
  }

  async copyPath(path) {
    let pass = new TemplatePassthrough(path, this.outputDir, this.inputDir);
    pass.setDryRun(this.isDryRun);

    return pass
      .write()
      .then(
        function() {
          this.count++;
          debug("Copied %o", path.inputPath);
        }.bind(this)
      )
      .catch(function(e) {
        return Promise.reject(
          new TemplatePassthroughManagerCopyError(
            `Having trouble copying '${path.inputPath}'`,
            e
          )
        );
      });
  }

  // Performance note: these can actually take a fair bit of time, but aren’t a
  // bottleneck to eleventy. The copies are performed asynchronously and don’t affect eleventy
  // write times in a significant way.
  async copyAll(paths) {
    if (!this.config.passthroughFileCopy) {
      debug("`passthroughFileCopy` is disabled in config, bypassing.");
      return;
    }

    let promises = [];
    debug("TemplatePassthrough copy started.");
    for (let path of this.getConfigPaths()) {
      debug(`TemplatePassthrough copying from config: ${path}`);
      promises.push(this.copyPath(path));
    }

    let passthroughPaths = this.getFilePaths(paths);
    for (let path of passthroughPaths) {
      let normalizedPath = this._normalizePaths(path);
      debug(
        `TemplatePassthrough copying from non-matching file extension: ${normalizedPath}`
      );
      promises.push(this.copyPath(normalizedPath));
    }

    return Promise.all(promises).then(() => {
      debug(`TemplatePassthrough copy finished. Current count: ${this.count}`);
    });
  }
}

module.exports = TemplatePassthroughManager;
