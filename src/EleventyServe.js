import assert from "node:assert";

import debugUtil from "debug";
import { Merge, DeepCopy, TemplatePath } from "@11ty/eleventy-utils";
import EleventyDevServer from "@11ty/eleventy-dev-server";

import EleventyBaseError from "./Errors/EleventyBaseError.js";
import ConsoleLogger from "./Util/ConsoleLogger.js";
import PathPrefixer from "./Util/PathPrefixer.js";
import checkPassthroughCopyBehavior from "./Util/PassthroughCopyBehaviorCheck.js";
import { getModulePackageJson } from "./Util/ImportJsonSync.js";
import { EleventyImport } from "./Util/Require.js";
import { isGlobMatch } from "./Util/GlobMatcher.js";

const debug = debugUtil("Eleventy:EleventyServe");

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
		this.logger = new ConsoleLogger();
		this._initOptionsFetched = false;
		this._aliases = undefined;
		this._watchedFiles = new Set();
	}

	get config() {
		if (!this.eleventyConfig) {
			throw new EleventyServeConfigError(
				"You need to set the eleventyConfig property on EleventyServe.",
			);
		}

		return this.eleventyConfig.getConfig();
	}

	set config(config) {
		throw new Error("It’s not allowed to set config on EleventyServe. Set eleventyConfig instead.");
	}

	setAliases(aliases) {
		this._aliases = aliases;

		if (this._server && "setAliases" in this._server) {
			this._server.setAliases(aliases);
		}
	}

	get eleventyConfig() {
		if (!this._eleventyConfig) {
			throw new EleventyServeConfigError(
				"You need to set the eleventyConfig property on EleventyServe.",
			);
		}

		return this._eleventyConfig;
	}

	set eleventyConfig(config) {
		this._eleventyConfig = config;
		if (checkPassthroughCopyBehavior(this._eleventyConfig.userConfig, "serve")) {
			this._eleventyConfig.userConfig.events.on("eleventy.passthrough", ({ map }) => {
				// for-free passthrough copy
				this.setAliases(map);
			});
		}
	}

	// TODO directorynorm
	setOutputDir(outputDir) {
		// TODO check if this is different and if so, restart server (if already running)
		// This applies if you change the output directory in your config file during watch/serve
		this.outputDir = outputDir;
	}

	async getServerModule(name) {
		try {
			if (!name || name === DEFAULT_SERVER_OPTIONS.module) {
				return EleventyDevServer;
			}

			// Look for peer dep in local project
			let projectNodeModulesPath = TemplatePath.absolutePath("./node_modules/");
			let serverPath = TemplatePath.absolutePath(projectNodeModulesPath, name);
			// No references outside of the project node_modules are allowed
			if (!serverPath.startsWith(projectNodeModulesPath)) {
				throw new Error("Invalid node_modules name for Eleventy server instance, received:" + name);
			}

			let serverPackageJson = getModulePackageJson(serverPath);
			// Normalize with `main` entry from
			if (TemplatePath.isDirectorySync(serverPath)) {
				if (serverPackageJson.main) {
					serverPath = TemplatePath.absolutePath(
						projectNodeModulesPath,
						name,
						serverPackageJson.main,
					);
				} else {
					throw new Error(
						`Eleventy server ${name} is missing a \`main\` entry in its package.json file. Traversed up from ${serverPath}.`,
					);
				}
			}

			let module = await EleventyImport(serverPath);

			if (!("getServer" in module)) {
				throw new Error(
					`Eleventy server module requires a \`getServer\` static method. Could not find one on module: \`${name}\``,
				);
			}

			if (serverPackageJson["11ty"]?.compatibility) {
				try {
					this.eleventyConfig.userConfig.versionCheck(serverPackageJson["11ty"].compatibility);
				} catch (e) {
					this.logger.warn(`Warning: \`${name}\` Plugin Compatibility: ${e.message}`);
				}
			}

			return module;
		} catch (e) {
			this.logger.error(
				"There was an error with your custom Eleventy server. We’re using the default server instead.\n" +
					e.message,
			);
			debug("Eleventy server error %o", e);
			return EleventyDevServer;
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
			this.config.serverOptions,
		);

		this._savedConfigOptions = DeepCopy({}, this.config.serverOptions);

		if (!this._initOptionsFetched && this.getSetupCallback()) {
			throw new Error(
				"Init options have not yet been fetched in the setup callback. This probably means that `init()` has not yet been called.",
			);
		}

		return this._options;
	}

	get server() {
		if (!this._server) {
			throw new Error("Missing server instance. Did you call .initServerInstance?");
		}

		return this._server;
	}

	async initServerInstance() {
		if (this._server) {
			return;
		}

		let serverModule = await this.getServerModule(this.options.module);

		// Static method `getServer` was already checked in `getServerModule`
		this._server = serverModule.getServer("eleventy-server", this.outputDir, this.options);

		this.setAliases(this._aliases);

		if (this._globsNeedWatching) {
			this._server.watchFiles(this._watchedFiles);
			this._globsNeedWatching = false;
		}
	}

	getSetupCallback() {
		let setupCallback = this.config.serverOptions.setup;
		if (setupCallback && typeof setupCallback === "function") {
			return setupCallback;
		}
	}

	async #init() {
		let setupCallback = this.getSetupCallback();
		if (setupCallback) {
			let opts = await setupCallback();
			this._initOptionsFetched = true;

			if (opts) {
				Merge(this.options, opts);
			}
		}
	}

	async init() {
		if (!this._initPromise) {
			this._initPromise = this.#init();
		}

		return this._initPromise;
	}

	// Port comes in here from --port on the command line
	async serve(port) {
		this._commandLinePort = port;

		await this.init();
		await this.initServerInstance();

		this.server.serve(port || this.options.port);
	}

	async close() {
		if (this._server) {
			await this._server.close();

			this._server = undefined;
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
		// Blow away cached options
		delete this._options;

		await this.close();

		// saved --port in `serve()`
		await this.serve(this._commandLinePort);

		// rewatch the saved watched files (passthrough copy)
		if ("watchFiles" in this.server) {
			this.server.watchFiles(this._watchedFiles);
		}
	}

	// checkPassthroughCopyBehavior check is called upstream in Eleventy.js
	// TODO globs are not removed from watcher
	watchPassthroughCopy(globs) {
		this._watchedFiles = globs;

		if (this._server && "watchFiles" in this.server) {
			this.server.watchFiles(globs);
			this._globsNeedWatching = false;
		} else {
			this._globsNeedWatching = true;
		}
	}

	isEmulatedPassthroughCopyMatch(filepath) {
		return isGlobMatch(filepath, this._watchedFiles);
	}

	hasOptionsChanged() {
		try {
			assert.deepStrictEqual(this.config.serverOptions, this._savedConfigOptions);
			return false;
		} catch (e) {
			return true;
		}
	}

	// Live reload the server
	async reload(reloadEvent = {}) {
		if (!this._server) {
			return;
		}

		// Restart the server if the options have changed
		if (this.hasOptionsChanged()) {
			debug("Server options changed, we’re restarting the server");
			await this.restart();
		} else {
			await this.server.reload(reloadEvent);
		}
	}
}

export default EleventyServe;
