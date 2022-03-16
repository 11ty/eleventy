const { TemplatePath } = require("@11ty/eleventy-utils");

const EleventyBaseError = require("./EleventyBaseError");
const ConsoleLogger = require("./Util/ConsoleLogger");
const PathPrefixer = require("./Util/PathPrefixer");
const merge = require("./Util/Merge");

const debug = require("debug")("EleventyServe");

class EleventyServeConfigError extends EleventyBaseError {}

const DEFAULT_SERVER_OPTIONS = {
  module: "@11ty/eleventy-dev-server",
  port: 8080,
  // pathPrefix: "/",
  // setup: function() {},
  // logger: { info: function() {}, error: function() {} }
};

class EleventyServe {
  constructor() {
    this.logger = new ConsoleLogger(true);
    this._initOptionsFetched = false;
  }

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

  get eleventyConfig() {
    if (!this._eleventyConfig) {
      throw new EleventyServeConfigError(
        "You need to set the eleventyConfig property on EleventyServe."
      );
    }

    return this._eleventyConfig;
  }

  set eleventyConfig(config) {
    this._eleventyConfig = config;
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

      let serverPackageJsonPath = TemplatePath.absolutePath(
        serverPath,
        "package.json"
      );

      let serverPackageJson = require(serverPackageJsonPath);
      if (
        serverPackageJson["11ty"] &&
        serverPackageJson["11ty"].compatibility
      ) {
        try {
          this.eleventyConfig.userConfig.versionCheck(
            serverPackageJson["11ty"].compatibility
          );
        } catch (e) {
          this.logger.warn(
            `Warning: \`${name}\` Plugin Compatibility: ${e.message}`
          );
        }
      }

      return module;
    } catch (e) {
      this.logger.error(
        "There was an error with your custom Eleventy server. We’re using the default server instead.\n" +
          e.message
      );
      debug("Eleventy server error %o", e);
      return require(DEFAULT_SERVER_OPTIONS.module);
    }
  }

  get options() {
    if (this._options) {
      return this._options;
    }

    this._options = Object.assign(
      {
        pathPrefix: PathPrefixer.normalizePathPrefix(this.config.pathPrefix),
        logger: this.logger,
      },
      DEFAULT_SERVER_OPTIONS,
      this.config.serverOptions
    );

    // TODO improve by sorting keys here
    this._savedConfigOptions = JSON.stringify(this.config.serverOptions);
    if (!this._initOptionsFetched && this.getSetupCallback()) {
      throw new Error(
        "Init options have not yet been fetched in the setup callback. This probably means that `init()` has not yet been called."
      );
    }

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

  getSetupCallback() {
    let setupCallback = this.config.serverOptions.setup;
    if (setupCallback && typeof setupCallback === "function") {
      return setupCallback;
    }
  }

  async init() {
    if (!this._initOptionsFetched) {
      this._initOptionsFetched = true;

      let setupCallback = this.getSetupCallback();
      if (setupCallback) {
        let opts = await setupCallback();
        if (opts) {
          merge(this.options, opts);
        }
      }
    }
  }

  // Port comes in here from --port on the command line
  async serve(port) {
    this._commandLinePort = port;
    if (!this._initOptionsFetched) {
      await this.init();
    }

    this.server.serve(port || this.options.port);
  }

  async close() {
    if (this._server) {
      await this.server.close();
      this.server = undefined;
    }
  }

  async sendError({ error }) {
    if (this._server) {
      await this.server.sendError({
        error,
      });
    }
  }

  // Restart the server entirely
  // We don’t want to use a native `restart` method (e.g. restart() in Vite) so that
  // we can correctly handle a `module` property change (changing the server type)
  async restart() {
    await this.close();

    // saved --port in `serve()`
    await this.serve(this._commandLinePort);
  }

  // Live reload the server
  async reload(reloadEvent = {}) {
    if (!this._server) {
      return;
    }

    // Restart the server if the options have changed
    if (
      JSON.stringify(this.config.serverOptions) !== this._savedConfigOptions
    ) {
      debug("Server options changed, we’re restarting the server");
      await this.restart();
    } else {
      await this.server.reload(reloadEvent);
    }
  }
}

module.exports = EleventyServe;
