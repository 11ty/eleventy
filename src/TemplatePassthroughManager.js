const config = require("./Config");
const EleventyBaseError = require("./EleventyBaseError");
const TemplatePassthrough = require("./TemplatePassthrough");
const TemplateRender = require("./TemplateRender");
const TemplatePath = require("./TemplatePath");
const debug = require("debug")("Eleventy:TemplatePassthroughManager");

class TemplatePassthroughManagerCopyError extends EleventyBaseError {}

class TemplatePassthroughManager {
  constructor(inputDir, outputDir, isDryRun) {
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

  getConfigPaths() {
    if (!this.config.passthroughFileCopy) {
      debug("`passthroughFileCopy` is disabled in config, bypassing.");
      return [];
    }

    let paths = [];
    let target = this.config.passthroughCopies || {};
    debug("`passthroughFileCopy` config paths: %o", target);
    for (let path in target) {
      paths.push(TemplatePath.addLeadingDotSlash(path));
    }
    debug("`passthroughFileCopy` config normalized paths: %o", paths);
    return paths;
  }

  getConfigPathGlobs() {
    return this.getConfigPaths().map(path => {
      return TemplatePath.convertToRecursiveGlob(path);
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
          debug("Copied %o", path);
        }.bind(this)
      )
      .catch(function(e) {
        throw new TemplatePassthroughManagerCopyError(
          `Having trouble copying '${path}'`,
          e
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
      promises.push(this.copyPath(path));
    }

    let passthroughPaths = this.getFilePaths(paths);
    for (let path of passthroughPaths) {
      promises.push(this.copyPath(path));
    }

    return Promise.all(promises).then(() => {
      debug(`TemplatePassthrough copy finished. Current count: ${this.count}`);
    });
  }
}

module.exports = TemplatePassthroughManager;
