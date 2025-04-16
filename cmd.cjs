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

class SimpleError extends Error {
	constructor(...args) {
		super(...args);
		this.skipOriginalStack = true;
	}
}

async function exec() {
	// Notes about friendly error messaging with outdated Node versions: https://github.com/11ty/eleventy/issues/3761
	const { EleventyErrorHandler } = await import("./src/Errors/EleventyErrorHandler.js");

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

		await elev.init();

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

			await elev.watch();

			if (argv.serve) {
				// TODO await here?
				elev.serve(argv.port);
			}

			process.on("SIGINT", async () => {
				await elev.stopWatch();
				process.exitCode = 0;
			});
		} else {
			if (!argv.to || argv.to === "fs") {
				await elev.write();
			} else if (argv.to === "json") {
				let result = await elev.toJSON()
				console.log(JSON.stringify(result, null, 2));
			} else if (argv.to === "ndjson") {
				let stream = await elev.toNDJSON();
				stream.pipe(process.stdout);
			} else {
				throw new SimpleError(
					`Invalid --to value: ${argv.to}. Supported values: \`fs\` (default), \`json\`, and \`ndjson\`.`,
				);
			}
		}
	} catch (error) {
		if(typeof EleventyErrorHandler !== "undefined") {
			let ErrorHandler = new EleventyErrorHandler();
			ErrorHandler.fatal(error, "Eleventy Fatal Error (CLI)");
		} else {
			console.error(error);
			process.exitCode = 1;
		}
	}
}

exec();
