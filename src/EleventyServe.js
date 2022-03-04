const EleventyServeAdapter = require("@11ty/eleventy-dev-server");
const TemplatePath = require("./TemplatePath");
const EleventyBaseError = require("./EleventyBaseError");
const ConsoleLogger = require("./Util/ConsoleLogger");
const PathPrefixer = require("./Util/PathPrefixer");
const debug = require("debug")("EleventyServe");

class EleventyServeConfigError extends EleventyBaseError {}

const DEFAULT_SERVER_OPTIONS = {
  port: 8080,
};

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
    return PathPrefixer.normalizePathPrefix(this.config.pathPrefix);
  }

  getBrowserSync() {
    try {
      // Look for project browser-sync (peer dep)
      let projectRequirePath = TemplatePath.absolutePath(
        "./node_modules/browser-sync"
      );
      return require(projectRequirePath);
    } catch (e) {
      debug("Could not find local project browser-sync.");

      // This will work with a globally installed browser-sync
      // try {
      //   this._server = require("browser-sync");
      // } catch (e) {
      //   debug("Could not find globally installed browser-sync.");
      // }
    }
  }

  get server() {
    if (this._server) {
      return this._server;
    }

    this._usingBrowserSync = true;
    this._server = this.getBrowserSync();

    if (!this._server) {
      this._usingBrowserSync = false;
      debug("Using Eleventy Serve server.");
      // TODO option to use a different server than @11ty/eleventy-dev-server
      this._server = EleventyServeAdapter.getServer(
        "eleventy-server",
        this.config.dir.output,
        this.getDefaultServerOptions(),
        {
          transformUrl: PathPrefixer.joinUrlParts,
          templatePath: TemplatePath,
          logger: new ConsoleLogger(true),
        }
      );
    }

    return this._server;
  }

  getBrowserSyncOptions(port) {
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
        port: port || DEFAULT_SERVER_OPTIONS.port,
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

  getDefaultServerOptions(port) {
    let opts = Object.assign(
      {
        pathPrefix: PathPrefixer.normalizePathPrefix(this.config.pathPrefix),
      },
      DEFAULT_SERVER_OPTIONS,
      this.config.serverOptions
    );

    if (port) {
      return Object.assign(opts, { port });
    }
    return opts;
  }

  getOptions(port) {
    if (this._usingBrowserSync === true || this.getBrowserSync()) {
      return this.getBrowserSyncOptions(port);
    }
    return this.getDefaultServerOptions(port);
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

  // Not available in Browser Sync
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
