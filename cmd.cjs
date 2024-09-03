#!/usr/bin/env node

// This file intentionally uses older code conventions to be as friendly
// as possible with error messaging to folks on older runtimes.

const pkg = require("./package.json");
require("please-upgrade-node")(pkg, {
	message: function (requiredVersion) {
		return (
			"Eleventy " +
			pkg.version +
			" requires Node " +
			requiredVersion +
			". You will need to upgrade Node to use Eleventy!"
		);
	},
});

const minimist = require("minimist");
const debug = require("debug")("Eleventy:cmd");

(async function () {
	const { EleventyErrorHandler } = await import("./src/Errors/EleventyErrorHandler.js");

	class SimpleError extends Error {
		constructor(...args) {
			super(...args);
			this.skipOriginalStack = true;
		}
	}

	try {
		const argv = minimist(process.argv.slice(2), {
			string: ["input", "output", "formats", "config", "pathprefix", "port", "to", "incremental", "loader"],
			boolean: [
				"quiet",
				"version",
				"watch",
				"dryrun",
				"help",
				"serve",
				"ignore-initial",
			],
			default: {
				quiet: null,
				"ignore-initial": false,
				"to": "fs",
			},
			unknown: function (unknownArgument) {
				throw new Error(
					`We don’t know what '${unknownArgument}' is. Use --help to see the list of supported commands.`,
				);
			},
		});

		debug("command: eleventy %o", argv);
		const { Eleventy } = await import("./src/Eleventy.js");

		let ErrorHandler = new EleventyErrorHandler();

		process.on("unhandledRejection", (error, promise) => {
			ErrorHandler.fatal(error, "Unhandled rejection in promise");
		});
		process.on("uncaughtException", (error) => {
			ErrorHandler.fatal(error, "Uncaught exception");
		});
		process.on("rejectionHandled", (promise) => {
			ErrorHandler.warn(promise, "A promise rejection was handled asynchronously");
		});

		if (argv.version) {
			console.log(Eleventy.getVersion());
			return;
		} else if (argv.help) {
			console.log(Eleventy.getHelp());
			return;
		}

		let elev = new Eleventy(argv.input, argv.output, {
			source: "cli",
			// --quiet and --quiet=true both resolve to true
			quietMode: argv.quiet,
			configPath: argv.config,
			pathPrefix: argv.pathprefix,
			runMode: argv.serve ? "serve" : argv.watch ? "watch" : "build",
			dryRun: argv.dryrun,
			loader: argv.loader,
		});

		// reuse ErrorHandler instance in Eleventy
		ErrorHandler = elev.errorHandler;

		// Before init
		elev.setFormats(argv.formats);

		// careful, we can’t use async/await here to error properly
		// with old node versions in `please-upgrade-node` above.
		elev
			.init()
			.then(() => {
				if (argv.to === "json" || argv.to === "ndjson") {
					// override logging output
					elev.setIsVerbose(false);
				}

				// Only relevant for watch/serve
				elev.setIgnoreInitial(argv["ignore-initial"]);

				if(argv.incremental) {
					elev.setIncrementalFile(argv.incremental);
				} else if(argv.incremental !== undefined) {
					elev.setIncrementalBuild(argv.incremental === "" || argv.incremental);
				}

				if (argv.serve || argv.watch) {
					if(argv.to === "json" || argv.to === "ndjson") {
						throw new SimpleError("--to=json and --to=ndjson are not compatible with --serve or --watch.");
					}

					elev
						.watch()
						.then(() => {
							if (argv.serve) {
								elev.serve(argv.port);
							}
						}, error => {
							// A build error occurred and we aren’t going to --serve
							ErrorHandler.once("error", error, "Eleventy Error (Watch CLI)");
						});

					process.on("SIGINT", async () => {
						await elev.stopWatch();
						process.exitCode = 0;
					});
				} else {
					if (!argv.to || argv.to === "fs") {
						elev.write().catch(error => {
							ErrorHandler.once("fatal", error, "Eleventy Error (FS CLI)");
						});
					} else if (argv.to === "json") {
						elev.toJSON().then(function (result) {
							console.log(JSON.stringify(result, null, 2));
						}, error => {
							ErrorHandler.once("fatal", error, "Eleventy Error (JSON CLI)");
						});
					} else if (argv.to === "ndjson") {
						elev.toNDJSON().then(function (stream) {
							stream.pipe(process.stdout);
						}, error => {
							ErrorHandler.once("fatal", error, "Eleventy Error (JSON CLI)");
						});
					} else {
						throw new SimpleError(
							`Invalid --to value: ${argv.to}. Supported values: \`fs\` (default), \`json\`, and \`ndjson\`.`,
						);
					}
				}
			}).catch(error => {
				ErrorHandler.fatal(error, "Eleventy Error (CLI)");
			});
	} catch (error) {
		let ErrorHandler = new EleventyErrorHandler();
		ErrorHandler.fatal(error, "Eleventy Fatal Error (CLI)");
	}
})();
