const { TemplatePath } = require("@11ty/eleventy-utils");

const EleventyBaseError = require("./EleventyBaseError");
const ConsoleLogger = require("./Util/ConsoleLogger");
const PathPrefixer = require("./Util/PathPrefixer");
const debug = require("debug")("EleventyServe");

class EleventyServeConfigError extends EleventyBaseError {}

const DEFAULT_SERVER_OPTIONS = {
  module: "@11ty/eleventy-dev-server",
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
    this._options = null;
    this._config = config;
  }

  setOutputDir(outputDir) {
    this.outputDir = outputDir;
  }

  getServerModule(name) {
    try {
      if (!name || name === DEFAULT_SERVER_OPTIONS.module) {
        return require(DEFAULT_SERVER_OPTIONS.module);
      }

      // Look for peer dep in local project
      let projectNodeModulesPath = TemplatePath.absolutePath("./node_modules/");
      let serverPath = TemplatePath.absolutePath(projectNodeModulesPath, name);

      // No references outside of the project node_modules are allowed
      if (!serverPath.startsWith(projectNodeModulesPath)) {
        throw new Error(
          "Invalid node_modules name for Eleventy server instance, received:" +
            name
        );
      }

      let module = require(serverPath);

      if (!("getServer" in module)) {
        throw new Error(
          `Eleventy server module requires a \`getServer\` static method. Could not find one on module: \`${name}\``
        );
      }

      return module;
    } catch (e) {
      debug(
        "Could not find your custom Eleventy server: %o. Using the default server instead.",
        e
      );
      return require(DEFAULT_SERVER_OPTIONS.module);
    }
  }

  get options() {
    if (this._options) {
      return this._options;
    }

    this._options = this.getOptions();

    // TODO improve by sorting keys here
    this._savedOptions = JSON.stringify(this._options);

    return this._options;
  }

  get server() {
    if (this._server) {
      return this._server;
    }

    let serverModule = this.getServerModule(this.options.module);

    // Static method `getServer` was already checked in `getServerModule`
    this._server = serverModule.getServer(
      "eleventy-server",
      this.config.dir.output,
      this.options
    );

    return this._server;
  }

  set server(val) {
    this._server = val;
  }

  getOptions() {
    let opts = Object.assign(
      {
        pathPrefix: PathPrefixer.normalizePathPrefix(this.config.pathPrefix),
        logger: new ConsoleLogger(true),
      },
      DEFAULT_SERVER_OPTIONS,
      this.config.serverOptions
    );

    return opts;
  }

  // Port comes in here from --port on the command line
  serve(port) {
    let server = this.server;

    this._commandLinePort = port;
    server.serve(port || this.options.port);
  }

  close() {
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
  }

  sendError({ error }) {
    if (this.server) {
      this.server.sendError({
        error,
      });
    }
  }

  // Restart the server entirely
  restart() {
    this.close();

    // saved --port in `serve()`
    this.serve(this._commandLinePort);
  }

  // Live reload the server
  async reload(reloadEvent = {}) {
    if (!this.server) {
      return;
    }

    // Restart the server if the options have changed
    if (JSON.stringify(this.getOptions()) !== this._savedOptions) {
      debug("Server options changed, we’re restarting the server");
      this.restart();
    } else {
      await this.server.reload(reloadEvent);
    }
  }
}

module.exports = EleventyServe;
