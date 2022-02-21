const path = require("path");

const TemplatePath = require("./TemplatePath");
const EleventyBaseError = require("./EleventyBaseError");

class EleventyServeConfigError extends EleventyBaseError {}
class EleventyServe {
  constructor() {}

  get config() {
    if (!this._config) {
      throw new EleventyServeConfigError(
        "You need to set the config property on EleventyServe."
      );
    }

    return this._config;
  }

  set config(config) {
    this._config = config;
  }

  setOutputDir(outputDir) {
    this.outputDir = outputDir;
  }

  getPathPrefix() {
    let cfgPrefix = this.config.pathPrefix;
    if (cfgPrefix) {
      // add leading / (for browsersync), see #1454
      // path.join uses \\ for Windows so we split and rejoin
      return path.join("/", cfgPrefix).split(path.sep).join("/");
    }
    return "/";
  }

  getRedirectDir(dirName) {
    return TemplatePath.join(this.outputDir, dirName);
  }

  getRedirectFilename(dirName) {
    return TemplatePath.join(this.getRedirectDir(dirName), "index.html");
  }

  getOptions(port) {
    // get server options
  }

  serve(port) {
    // create server
  }

  close() {
    // close server
  }

  /* filesToReload is optional */
  reload(filesToReload) {
    // reload files
  }
}

module.exports = EleventyServe;
