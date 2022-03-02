const path = require("path");

const TemplatePath = require("./TemplatePath");
const EleventyServeAdapter = require("./EleventyServeAdapter");
const EleventyBaseError = require("./EleventyBaseError");
const debug = require("debug")("EleventyServe");

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
    return EleventyServeAdapter.normalizePathPrefix(this.config.pathPrefix);
  }

  get server() {
    if (this._server) {
      return this._server;
    }

    this._usingBrowserSync = true;

    try {
      // Look for project browser-sync (peer dep)
      let projectRequirePath = TemplatePath.absolutePath(
        "./node_modules/browser-sync"
      );
      this._server = require(projectRequirePath);
    } catch (e) {
      debug("Could not find local project browser-sync.");
      try {
        this._server = require("browser-sync");
      } catch (e) {
        debug("Could not find globally installed browser-sync.");
      }
    }

    if (!this._server) {
      debug("Using fallback serve-static");
      this._server = EleventyServeAdapter.getServer(
        "eleventy-server",
        this.config
      );
      this._usingBrowserSync = false;
    }

    return this._server;
  }

  getOptions(port) {
    let pathPrefix = this.getPathPrefix();

    // TODO customize this in Configuration API?
    let serverConfig = {
      baseDir: this.outputDir,
    };

    if (pathPrefix) {
      serverConfig.baseDir = undefined;
      serverConfig.routes = {};
      serverConfig.routes[pathPrefix] = this.outputDir;
    }

    return Object.assign(
      {
        server: serverConfig,
        port: port || 8080,
        ignore: ["node_modules"],
        watch: false,
        open: false,
        notify: false,
        ui: false, // Default changed in 1.0
        ghostMode: false, // Default changed in 1.0
        index: "index.html",
      },
      this.config.browserSyncConfig
    );
  }

  serve(port) {
    let options = this.getOptions(port);

    this.server.init(options);

    // this needs to happen after `.getOptions`
    this.savedPathPrefix = this.getPathPrefix();
  }

  close() {
    if (this.server) {
      this.server.exit();
    }
  }

  sendError({ error }) {
    if (!this._usingBrowserSync && this.server) {
      this.server.sendError({
        error,
      });
    }
  }

  async reload(reloadEvent = {}) {
    if (!this.server) {
      return;
    }

    if (this.getPathPrefix() !== this.savedPathPrefix) {
      this.server.exit();
      this.serve();
    } else {
      if (this._usingBrowserSync) {
        // Backwards compat
        this.server.reload(reloadEvent.subtype === "css" ? "*.css" : undefined);
      } else {
        await this.server.reload(reloadEvent);
      }
    }
  }
}

module.exports = EleventyServe;
