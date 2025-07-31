import debugUtil from "debug";
import { Merge, TemplatePath } from "@11ty/eleventy-utils";

import { GlobStripper } from "./Util/GlobStripper.js";

function stringifyOptions(options) {
	return JSON.stringify(options, function replacer(key, value) {
		if (typeof value === "function") {
			return value.toString();
		}

		return value;
	});
}

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
	// ready: function(server) {},
	// logger: { info: function() {}, error: function() {} }
};

class EleventyServe {
	#eleventyConfig;
	#savedConfigOptions;
	#aliases;
	#initOptionsFetched = false;
	// these are *not* normalized
	#watchTargets = new Set();
	// these *are* normalized
	#queuedWatchTargets = new Set();
	#defaultWatchIgnores = ["**/node_modules/**", ".git"];

	constructor() {
		this.logger = new ConsoleLogger();
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
		this.#aliases = aliases;

		if (this._server && "setAliases" in this._server) {
			this._server.setAliases(aliases);
		}
	}

	get eleventyConfig() {
		if (!this.#eleventyConfig) {
			throw new EleventyServeConfigError(
				"You need to set the eleventyConfig property on EleventyServe.",
			);
		}

		return this.#eleventyConfig;
	}

	set eleventyConfig(config) {
		this.#eleventyConfig = config;

		if (checkPassthroughCopyBehavior(this.#eleventyConfig.userConfig, "serve")) {
			this.#eleventyConfig.userConfig.events.on("eleventy.passthrough", ({ map }) => {
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

	static getDevServer() {
		// This happens on demand for performance purposes when not used by builds
		// https://github.com/11ty/eleventy/pull/3689
		return import("@11ty/eleventy-dev-server").then((i) => i.default);
	}

	async getServerModule(name) {
		try {
			if (!name || name === DEFAULT_SERVER_OPTIONS.module) {
				return EleventyServe.getDevServer();
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

			return EleventyServe.getDevServer();
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

		this.#savedConfigOptions = this.config.serverOptions;

		if (!this.#initOptionsFetched && this.getSetupCallback()) {
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

		// Fix for missing globs in Chokidar@4
		if (this.options.module === DEFAULT_SERVER_OPTIONS.module) {
			this.options.chokidarOptions ??= {};
			this.options.chokidarOptions.ignored = (filepath) => {
				if (
					!isGlobMatch(filepath, Array.from(this.#watchTargets)) ||
					isGlobMatch(filepath, this.#defaultWatchIgnores)
				) {
					return true;
				}
			};
		}

		// Static method `getServer` was already checked in `getServerModule`
		this._server = serverModule.getServer("eleventy-server", this.outputDir, this.options);

		this.setAliases(this.#aliases);

		if (this.#queuedWatchTargets.size > 0) {
			this.#watch(this.#watchTargets);
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
			this.#initOptionsFetched = true;

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

		if (typeof this.config.serverOptions?.ready === "function") {
			if (typeof this.server.ready === "function") {
				// Dev Server 2.0.7+
				// wait for ready promise to resolve before triggering ready callback
				await this.server.ready();
				await this.config.serverOptions?.ready(this.server);
			} else {
				throw new Error(
					"The `ready` option in Eleventy’s `setServerOptions` method requires a `ready` function on the Dev Server instance. If you’re using Eleventy Dev Server, you will need Dev Server 2.0.7+ or newer to use this feature.",
				);
			}
		}
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

	// when the configuration file changes (but server options *may* not, which would otherwise trigger restart())
	resetConfig() {
		this.#watchTargets = new Set();
		this.#queuedWatchTargets = new Set();
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
		this.#watch(this.#watchTargets);
	}

	queueWatchTargets(globs = []) {
		for (let glob of globs) {
			this.#queuedWatchTargets.add(glob);
		}
	}

	unqueueWatchTargets(globs = []) {
		for (let glob of globs) {
			this.#queuedWatchTargets.delete(glob);
		}
	}

	#watch(globs = []) {
		let uniqueSet = new Set();
		for (let target of globs) {
			let { path } = GlobStripper.parse(target);
			if (path) {
				uniqueSet.add(path);
			}
		}

		let normalizedGlobs = Array.from(uniqueSet);
		if (normalizedGlobs.length > 0) {
			if (this._server && "watchFiles" in this.server) {
				this.server.watchFiles(normalizedGlobs);
				this.unqueueWatchTargets(normalizedGlobs);
			} else {
				// server not yet available
				this.queueWatchTargets(normalizedGlobs);
			}
		}
	}

	// checkPassthroughCopyBehavior check is called upstream in Eleventy.js
	watchPassthroughCopy(globs = []) {
		for (let glob of globs) {
			this.#watchTargets.add(glob);
		}
		this.#watch(this.#watchTargets);
	}

	isEmulatedPassthroughCopyMatch(filepath) {
		return isGlobMatch(filepath, Array.from(this.#watchTargets));
	}

	hasOptionsChanged() {
		return (
			stringifyOptions(this.config.serverOptions) !== stringifyOptions(this.#savedConfigOptions)
		);
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
