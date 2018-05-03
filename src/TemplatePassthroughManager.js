const config = require("./Config");
const TemplatePassthrough = require("./TemplatePassthrough");
const TemplateRender = require("./TemplateRender");
const debug = require("debug")("Eleventy:TemplatePassthroughManager");

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
    if (this.config.passthroughFileCopy) {
      return this.config.passthroughCopies || {};
    }

    debug("`passthroughFileCopy` is disabled in config, bypassing.");
    return {};
  }

  getCopyCount() {
    return this.count;
  }

  async copyPath(path) {
    let pass = new TemplatePassthrough(path, this.outputDir, this.inputDir);
    pass.setDryRun(this.isDryRun);

    try {
      await pass.write();
      debug("Copied %o", path);
    } catch (e) {
      throw EleventyError.make(new Error(`Having trouble copying: ${path}`), e);
    }
  }

  async copyConfigPaths() {
    for (let cfgPath in this.getConfigPaths()) {
      this.count++;
      this.copyPath(cfgPath);
    }
  }

  // Performance note: these can actually take a fair bit of time, but aren’t a
  // bottleneck to eleventy. The copies are performed asynchronously and don’t affect eleventy
  // write times in a significant way.
  // TODO because we aren’t using await here—eleventy could finish before the copy is done.
  async copyAll(paths) {
    if (!this.config.passthroughFileCopy) {
      debug("`passthroughFileCopy` is disabled in config, bypassing.");
      return;
    }

    debug("TemplatePassthrough copy started.");
    this.copyConfigPaths();

    let templateCount = 0;
    let timer = new Date();
    for (let path of paths) {
      if (!TemplateRender.hasEngine(path)) {
        this.count++;
        templateCount++;
        this.copyPath(path);
      }
    }

    debug(`TemplatePassthrough copy finished. Current count: ${this.count}`);
  }
}

module.exports = TemplatePassthroughManager;
